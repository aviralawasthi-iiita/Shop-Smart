// pages/api/user/quiettime.ts
import prisma from '../../../../lib/db';
import { NextRequest, NextResponse } from 'next/server';

export type UserQuietTime = {
  id: number;
  storeId: number;
  storeLocation: string;
  date: string;
  timeWindow: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
};

export async function POST(
  req: NextRequest,
) {
  if (req.method === 'POST') {
    const { userId, storeLocation, date, timeWindow, reason } = await req.json() as {
      userId?: number;
      storeLocation?: string;
      date?: string;
      timeWindow?: string;
      reason?: string;
    };
    if (
      typeof userId !== 'number' ||
      !storeLocation ||
      !date ||
      !timeWindow
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, {status: 400});
    }

    try {
      // Find the store by location
      let store = await prisma.store.findFirst({
        where: { storeLocation }
      });

      // If store doesn't exist, create a dummy one so the request doesn't fail
      if (!store) {
        store = await prisma.store.create({
          data: {
            managerEmail: `dummy_${Date.now()}@shopsmart.com`,
            storeLocation: storeLocation,
            managerPassword: "dummy",
          }
        });
      }

      const quietTime = await prisma.quietTime.create({
        data: {
          userId,
          storeId: store.storeId,
          date: new Date(date),
          timewindow: timeWindow,
          reason: reason || null
        }
      });

      // Retrieve user details to publish correct userName
      const dbUser = await prisma.user.findUnique({
        where: { userId }
      });
      const userName = dbUser ? dbUser.name : "Customer";

      // Produce quiet time request to Kafka
      const { producer } = await import("@/lib/kafka");
      await producer.send({
        topic: "store-requests",
        messages: [
          {
            value: JSON.stringify({
              id: quietTime.id,
              userId: userId.toString(),
              userName,
              storeLocation: store.storeLocation,
              date: quietTime.date.toISOString().split('T')[0],
              timeWindow: quietTime.timewindow,
              reason: quietTime.reason || '',
              status: "pending",
              storeId: quietTime.storeId
            }),
          },
        ],
      });

      return NextResponse.json({ insertedId: quietTime.id },{status: 201});
    } catch (err) {
      console.error(err);
      return NextResponse.json({ error: 'DB error' },{status: 500});
    }
  }
}

export async function GET(req : NextRequest){
  if (req.method === 'GET') {
    const {searchParams} = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const userId = userIdParam ? Number(userIdParam) : NaN;

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'userId query param required' },{status: 400});
    }

    try {
      const quietTimes = await prisma.quietTime.findMany({
        where: { userId },
        include: { store: true }
      });

      const formatted: UserQuietTime[] = quietTimes.map(q => ({
        id: q.id,
        storeId: q.storeId,
        storeLocation: q.store.storeLocation,
        date: q.date.toISOString().split('T')[0],
        timeWindow: q.timewindow,
        reason: q.reason || '',
        status: q.status as 'pending' | 'approved' | 'rejected',
      }));

      return NextResponse.json(formatted,{status: 200});
    } catch (err) {
      console.error(err);
      return NextResponse.json({ error: 'DB error' },{status : 500});
    }
  }
}
