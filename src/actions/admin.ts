import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { Role, ReportStatus, WorkOrderStatus } from '@/lib/generated/prisma/client'
import { revalidatePath } from 'next/cache'
import { createNotification } from './notifications'
import { logAudit } from '@/lib/audit'
import * as XLSX from 'xlsx'

async function requireAdmin() {
  const session = await getSession()
  if (!session || !['ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function getTechnicians() {
  await requireAdmin()
  return prisma.user.findMany({
    where: { role: Role.TECHNICIAN, isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      barangay: true,
    },
    orderBy: { firstName: 'asc' },
  })
}

export async function updateUserRole(userId: string, newRole: string) {
  const session = await requireAdmin()
  if (!Object.values(Role).includes(newRole as Role)) throw new Error('Invalid role')

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) throw new Error('User not found')
  if (target.role === Role.SUPERADMIN) throw new Error('Cannot change SUPERADMIN role')

  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole as Role },
  })

  await logAudit('UPDATE_USER_ROLE', 'User', userId, JSON.stringify({ newRole }))

  revalidatePath('/admin/users')
  revalidatePath('/admin/dashboard')
  revalidatePath('/dashboard')
}

export async function toggleUserActive(userId: string, active: boolean) {
  const session = await requireAdmin()

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) throw new Error('User not found')
  if (target.role === Role.SUPERADMIN) throw new Error('Cannot deactivate SUPERADMIN')

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: active },
  })

  await logAudit(active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER', 'User', userId)

  revalidatePath('/admin/users')
  revalidatePath('/admin/dashboard')
}

export async function assignWorkOrder(faultReportId: string, technicianId: string) {
  const session = await requireAdmin()

  const report = await prisma.faultReport.findUnique({
    where: { id: faultReportId },
    include: { pole: true },
  })
  if (!report) throw new Error('Fault report not found')
  if (report.status !== ReportStatus.OPEN) throw new Error('Report is not open')

  const order = await prisma.workOrder.create({
    data: {
      faultReportId,
      assignedToId: technicianId,
      assignedById: session.user.id,
      status: WorkOrderStatus.ASSIGNED,
    },
  })

  await prisma.faultReport.update({
    where: { id: faultReportId },
    data: { status: ReportStatus.IN_PROGRESS },
  })

  await createNotification({
    userId: technicianId,
    title: 'New Work Order Assigned',
    message: `Work order for ${report.pole.poleCode} — ${report.faultType.replace('_', ' ')} has been assigned to you by ${session.user.name}.`,
    type: 'WORK_ORDER',
  })

  await logAudit('ASSIGN_WORK_ORDER', 'WorkOrder', order.id, JSON.stringify({ faultReportId, technicianId }))

  revalidatePath('/admin/faults')
  revalidatePath('/faults')
  revalidatePath('/workorders')
  return order
}

export async function reassignWorkOrder(workOrderId: string, newTechnicianId: string) {
  const session = await requireAdmin()

  const order = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: { faultReport: { include: { pole: true } }, assignedTo: true },
  })
  if (!order) throw new Error('Work order not found')

  const oldTechId = order.assignedToId

  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: { assignedToId: newTechnicianId, status: WorkOrderStatus.ASSIGNED },
  })

  await createNotification({
    userId: newTechnicianId,
    title: 'Work Order Reassigned to You',
    message: `Work order for ${order.faultReport.pole.poleCode} has been reassigned to you by ${session.user.name}.`,
    type: 'WORK_ORDER',
  })

  if (oldTechId) {
    await createNotification({
      userId: oldTechId,
      title: 'Work Order Reassigned',
      message: `Work order for ${order.faultReport.pole.poleCode} was reassigned to another technician.`,
      type: 'WORK_ORDER',
    })
  }

  await logAudit('REASSIGN_WORK_ORDER', 'WorkOrder', workOrderId, JSON.stringify({ newTechnicianId }))

  revalidatePath('/workorders')
  revalidatePath('/admin/faults')
}

export async function getTechnicianPerformance() {
  await requireAdmin()

  const technicians = await prisma.user.findMany({
    where: { role: Role.TECHNICIAN },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      barangay: true,
      workOrdersAssigned: {
        select: {
          id: true,
          status: true,
          assignedAt: true,
          resolvedAt: true,
        },
      },
    },
    orderBy: { firstName: 'asc' },
  })

  return technicians.map((t) => {
    const total = t.workOrdersAssigned.length
    const resolved = t.workOrdersAssigned.filter((wo) => wo.status === WorkOrderStatus.RESOLVED)
    const pending = t.workOrdersAssigned.filter((wo) =>
      ([WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.PENDING] as WorkOrderStatus[]).includes(wo.status)
    )
    const avgTimeMs = resolved.reduce((sum, wo) => {
      if (wo.resolvedAt) return sum + (wo.resolvedAt.getTime() - wo.assignedAt.getTime())
      return sum
    }, 0)
    const avgTimeHours = resolved.length > 0 ? Math.round(avgTimeMs / resolved.length / 3600000) : 0

    return {
      id: t.id,
      name: `${t.firstName} ${t.lastName}`,
      email: t.email,
      barangay: t.barangay,
      totalJobs: total,
      resolvedJobs: resolved.length,
      pendingJobs: pending.length,
      avgResolutionHours: avgTimeHours,
    }
  })
}

export async function triageFaultReport(
  reportId: string,
  action: 'CLOSE_INVALID' | 'MARK_DUPLICATE' | 'ADD_NOTE',
  note?: string
) {
  const session = await requireAdmin()

  const report = await prisma.faultReport.findUnique({ where: { id: reportId }, include: { pole: true } })
  if (!report) throw new Error('Fault report not found')

  if (action === 'CLOSE_INVALID') {
    await prisma.faultReport.update({
      where: { id: reportId },
      data: { status: ReportStatus.CLOSED },
    })
  } else if (action === 'MARK_DUPLICATE') {
    await prisma.faultReport.update({
      where: { id: reportId },
      data: { status: ReportStatus.CLOSED },
    })
  }

  if (note) {
    await prisma.faultReport.update({
      where: { id: reportId },
      data: { adminNotes: note },
    })
  }

  await logAudit('TRIAGE_FAULT_REPORT', 'FaultReport', reportId, JSON.stringify({ action, note }))

  revalidatePath('/admin/faults')
  revalidatePath('/faults')
}

export async function getFaultReportDetails(reportId: string) {
  await requireAdmin()
  return prisma.faultReport.findUnique({
    where: { id: reportId },
    include: {
      pole: true,
      reportedBy: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      workOrder: {
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          maintenanceLogs: true,
        },
      },
    },
  })
}

export async function broadcastNotification(
  targetRole: 'ALL' | 'TECHNICIANS' | 'USERS',
  title: string,
  message: string
) {
  await requireAdmin()

  const where =
    targetRole === 'ALL' ? {} :
    targetRole === 'TECHNICIANS' ? { role: Role.TECHNICIAN } :
    { role: Role.USER }

  const users = await prisma.user.findMany({ where, select: { id: true } })

  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      title,
      message,
      type: 'INFO',
    })),
  })

  await logAudit('BROADCAST_NOTIFICATION', 'Notification', undefined, JSON.stringify({ targetRole, title }))

  revalidatePath('/')
}

export async function exportFaultReportsCsv(params: {
  from?: string
  to?: string
  barangay?: string
  status?: string
}) {
  await requireAdmin()

  const where: any = {}
  if (params.from || params.to) {
    where.reportedAt = {}
    if (params.from) where.reportedAt.gte = new Date(params.from)
    if (params.to) where.reportedAt.lte = new Date(params.to + 'T23:59:59.999Z')
  }
  if (params.barangay) where.pole = { barangay: params.barangay }
  if (params.status) where.status = params.status

  const reports = await prisma.faultReport.findMany({
    where,
    include: {
      pole: { select: { poleCode: true, barangay: true, address: true } },
      reportedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { reportedAt: 'desc' },
  })

  const header = 'ID,Pole Code,Barangay,Address,Fault Type,Description,Status,Reporter Name,Reported At,Admin Notes\n'
  const rows = reports.map((r) =>
    [
      r.id,
      r.pole.poleCode,
      r.pole.barangay,
      `"${r.pole.address.replace(/"/g, '""')}"`,
      r.faultType,
      `"${r.description.replace(/"/g, '""')}"`,
      r.status,
      r.reportedBy ? `${r.reportedBy.firstName} ${r.reportedBy.lastName}` : r.reporterName || 'Anonymous',
      r.reportedAt.toISOString(),
      r.adminNotes ? `"${r.adminNotes.replace(/"/g, '""')}"` : '',
    ].join(',')
  )

  return header + rows.join('\n')
}

export async function exportFaultReportsTemplate() {
  await requireAdmin()

  const header = 'ID,Pole Code,Barangay,Address,Fault Type,Description,Status,Reporter Name,Reported At,Admin Notes\n'
  return header
}

export async function exportFaultReportsExcel(params: {
  from?: string
  to?: string
  barangay?: string
  status?: string
}) {
  await requireAdmin()

  const where: any = {}
  if (params.from || params.to) {
    where.reportedAt = {}
    if (params.from) where.reportedAt.gte = new Date(params.from)
    if (params.to) where.reportedAt.lte = new Date(params.to + 'T23:59:59.999Z')
  }
  if (params.barangay) where.pole = { barangay: params.barangay }
  if (params.status) where.status = params.status

  const reports = await prisma.faultReport.findMany({
    where,
    include: {
      pole: { select: { poleCode: true, barangay: true, address: true } },
      reportedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { reportedAt: 'desc' },
  })

  const data = reports.map((r) => ({
    ID: r.id,
    'Pole Code': r.pole.poleCode,
    Barangay: r.pole.barangay,
    Address: r.pole.address,
    'Fault Type': r.faultType,
    Description: r.description,
    Status: r.status,
    'Reporter Name': r.reportedBy ? `${r.reportedBy.firstName} ${r.reportedBy.lastName}` : r.reporterName || 'Anonymous',
    'Reported At': r.reportedAt.toISOString(),
    'Admin Notes': r.adminNotes || '',
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Fault Reports')
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  return excelBuffer
}

export async function getAdminUsers() {
  await requireAdmin()
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      city: true,
      barangay: true,
      isActive: true,
      createdAt: true,
    },
  })
}

export async function getAdminFaultReports() {
  await requireAdmin()
  return prisma.faultReport.findMany({
    orderBy: { reportedAt: 'desc' },
    include: {
      pole: { select: { id: true, poleCode: true, barangay: true, address: true } },
      reportedBy: { select: { id: true, firstName: true, lastName: true } },
      workOrder: {
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  })
}
