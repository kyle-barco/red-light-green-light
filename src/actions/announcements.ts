"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function getAnnouncements(limit = 5) {
  const session = await getSession();
  if (!session?.user?.id) return [];

  return prisma.notification.findMany({
    where: { userId: session.user.id, type: "INFO" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      message: true,
      read: true,
      createdAt: true,
    },
  });
}

export async function getUnreadAnnouncementsCount() {
  const session = await getSession();
  if (!session?.user?.id) return 0;

  return prisma.notification.count({
    where: { userId: session.user.id, type: "INFO", read: false },
  });
}
