"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { FaultType, PoleStatus, ReportStatus, Role } from "@/lib/generated/prisma";
import { createNotification } from "@/actions/notifications";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

export async function getNearbyFaultyPoles(lat: number, lng: number, radiusKm = 5) {
  const degreeRadius = radiusKm / 111;
  const poles = await prisma.pole.findMany({
    where: {
      status: PoleStatus.FAULTY,
      latitude: { gte: lat - degreeRadius, lte: lat + degreeRadius },
      longitude: { gte: lng - degreeRadius, lte: lng + degreeRadius },
    },
    include: {
      _count: { select: { faultReports: { where: { status: { in: [ReportStatus.OPEN, ReportStatus.IN_PROGRESS] } } } } },
    },
  });
  return poles.map((p) => {
    const dist = Math.sqrt((p.latitude - lat) ** 2 + (p.longitude - lng) ** 2) * 111;
    return { ...p, distanceKm: Math.round(dist * 100) / 100 };
  }).sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function createAnonymousFaultReport(data: {
  poleId: string
  description: string
  faultType: FaultType
  reporterName?: string
  reporterEmail?: string
  reporterPhone?: string
  latitude?: number
  longitude?: number
  imageUrls?: string[]
}) {
  const pole = await prisma.pole.findUnique({ where: { id: data.poleId } });
  if (!pole) throw new Error("Pole not found");

  const report = await prisma.faultReport.create({
    data: {
      poleId: data.poleId,
      description: data.description,
      faultType: data.faultType,
      reporterName: data.reporterName,
      reporterEmail: data.reporterEmail,
      reporterPhone: data.reporterPhone,
      latitude: data.latitude ?? pole.latitude,
      longitude: data.longitude ?? pole.longitude,
      imageUrls: data.imageUrls ?? [],
      status: ReportStatus.OPEN,
    },
  });

  if (pole.status !== PoleStatus.FAULTY) {
    await prisma.pole.update({
      where: { id: data.poleId },
      data: { status: PoleStatus.FAULTY },
    });
  }

  const poleCode = pole.poleCode
  const adminsAndTechs = await prisma.user.findMany({
    where: { role: { in: [Role.ADMIN, Role.TECHNICIAN] } },
    select: { id: true },
  })
  await Promise.all(adminsAndTechs.map((u) =>
    createNotification({
      userId: u.id,
      title: 'New Fault Report',
      message: `An anonymous fault report was submitted for pole ${poleCode} — ${data.faultType}.`,
      type: 'NEW_FAULT_REPORT',
    })
  ))

  await logAudit('CREATE_ANONYMOUS_FAULT_REPORT', 'FaultReport', report.id, JSON.stringify({ poleId: data.poleId, faultType: data.faultType }))

  revalidatePath("/");
  revalidatePath("/faults");
  revalidatePath("/poles");
  return report;
}

export async function createUserFaultReport(data: {
  poleId: string
  description: string
  faultType: FaultType
  latitude?: number
  longitude?: number
  imageUrls?: string[]
}) {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const pole = await prisma.pole.findUnique({ where: { id: data.poleId } });
  if (!pole) throw new Error("Pole not found");

  const report = await prisma.faultReport.create({
    data: {
      poleId: data.poleId,
      reportedById: session.user.id,
      description: data.description,
      faultType: data.faultType,
      latitude: data.latitude ?? pole.latitude,
      longitude: data.longitude ?? pole.longitude,
      imageUrls: data.imageUrls ?? [],
    },
  });

  if (pole.status !== PoleStatus.FAULTY) {
    await prisma.pole.update({
      where: { id: data.poleId },
      data: { status: PoleStatus.FAULTY },
    });
    await prisma.statusLog.create({
      data: {
        poleId: data.poleId,
        changedById: session.user.id,
        fromStatus: pole.status,
        toStatus: PoleStatus.FAULTY,
        reason: `Fault reported: ${data.description}`,
      },
    });
  }

  const poleCode = pole.poleCode
  const recipients = await prisma.user.findMany({
    where: { role: { in: [Role.ADMIN, Role.TECHNICIAN] } },
    select: { id: true },
  })
  await Promise.all(recipients.map((u) =>
    createNotification({
      userId: u.id,
      title: 'New Fault Report',
      message: `${session.user.name ?? 'A user'} reported a fault at pole ${poleCode} — ${data.faultType}.`,
      type: 'NEW_FAULT_REPORT',
    })
  ))

  await logAudit('CREATE_USER_FAULT_REPORT', 'FaultReport', report.id, JSON.stringify({ poleId: data.poleId, faultType: data.faultType }))

  revalidatePath("/");
  revalidatePath("/faults");
  revalidatePath("/poles");
  return report;
}

export async function getUserFaultReports() {
  const session = await getSession();
  if (!session?.user?.id) return [];

  return prisma.faultReport.findMany({
    where: { reportedById: session.user.id },
    orderBy: { reportedAt: "desc" },
    include: {
      pole: { select: { poleCode: true, address: true, barangay: true } },
      workOrder: { select: { status: true, resolvedAt: true, resolutionNotes: true } },
    },
  });
}

export async function getMyReportStats() {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const reports = await prisma.faultReport.findMany({
    where: { reportedById: session.user.id },
    include: {
      workOrder: { select: { resolvedAt: true } },
    },
  });

  const total = reports.length;
  const open = reports.filter((r) => r.status === ReportStatus.OPEN).length;
  const inProgress = reports.filter((r) => r.status === ReportStatus.IN_PROGRESS).length;
  const resolved = reports.filter((r) => r.status === ReportStatus.RESOLVED).length;

  const avgResolutionTime = (() => {
    const resolvedReports = reports.filter(
      (r) => r.status === ReportStatus.RESOLVED && r.workOrder?.resolvedAt
    );
    if (resolvedReports.length === 0) return null;
    const totalMs = resolvedReports.reduce((sum, r) => {
      return sum + (r.workOrder!.resolvedAt!.getTime() - r.reportedAt.getTime());
    }, 0);
    const avgHours = totalMs / resolvedReports.length / (1000 * 60 * 60);
    return Math.round(avgHours * 10) / 10;
  })();

  return { total, open, inProgress, resolved, avgResolutionTime };
}

export async function getDeletedUserReports() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return prisma.faultReport.findMany({
    where: { reportedById: session.user.id, status: ReportStatus.DELETED },
    orderBy: { reportedAt: "desc" },
    include: {
      pole: { select: { poleCode: true, address: true, barangay: true } },
    },
  });
}

export async function getAllPolesForMap() {
  return prisma.pole.findMany({
    select: {
      id: true,
      poleCode: true,
      latitude: true,
      longitude: true,
      status: true,
      address: true,
      barangay: true,
    },
  });
}

export async function softDeleteUserReport(reportId: string) {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const report = await prisma.faultReport.findUnique({ where: { id: reportId } });
  if (!report) throw new Error("Report not found");
  if (report.reportedById !== session.user.id) throw new Error("Not your report");

  await prisma.faultReport.update({
    where: { id: reportId },
    data: { status: ReportStatus.DELETED },
  });

  await logAudit('SOFT_DELETE_REPORT', 'FaultReport', reportId)

  revalidatePath("/user/dashboard");
  revalidatePath("/my-reports");
  revalidatePath("/user/trash");
  return { success: true };
}

export async function restoreUserReport(reportId: string) {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const report = await prisma.faultReport.findUnique({ where: { id: reportId } });
  if (!report) throw new Error("Report not found");
  if (report.reportedById !== session.user.id) throw new Error("Not your report");
  if (report.status !== ReportStatus.DELETED) throw new Error("Report is not deleted");

  await prisma.faultReport.update({
    where: { id: reportId },
    data: { status: ReportStatus.OPEN },
  });

  await logAudit('RESTORE_REPORT', 'FaultReport', reportId)

  revalidatePath("/user/dashboard");
  revalidatePath("/my-reports");
  revalidatePath("/user/trash");
  return { success: true };
}

export async function editUserReport(reportId: string, data: {
  description: string
  faultType: FaultType
}) {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const report = await prisma.faultReport.findUnique({ where: { id: reportId } });
  if (!report) throw new Error("Report not found");
  if (report.reportedById !== session.user.id) throw new Error("Not your report");
  if (report.status === ReportStatus.DELETED) throw new Error("Cannot edit a deleted report");

  await prisma.faultReport.update({
    where: { id: reportId },
    data: {
      description: data.description,
      faultType: data.faultType,
    },
  });

  await logAudit('EDIT_REPORT', 'FaultReport', reportId)

  revalidatePath("/user/dashboard");
  revalidatePath("/my-reports");
  return { success: true };
}
