// pages/api/manager/quiettime.ts
import prisma from '../../../../lib/db';
import { NextRequest, NextResponse } from 'next/server';

export type ManagerQuietTime = {
  id: number;
  userId: string;
  userName: string;
  storeLocation: string;
  date: string;
  timeWindow: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
};

export async function GET(
  req: NextRequest,
) {
  if (req.method === 'GET') {
    const {searchParams} = new URL(req.url);
    const storeIdParam = searchParams.get('storeId');
    const storeId = storeIdParam ? Number(storeIdParam) : NaN;
    if (!storeId || isNaN(storeId)) {
      return NextResponse.json({ error: 'storeId query param required' },{status:400});
    }

    try {
      const quietTimes = await prisma.quietTime.findMany({
        where: { storeId },
        include: { user: true, store: true }
      });

      const formatted: ManagerQuietTime[] = quietTimes.map(q => ({
        id: q.id,
        userId: q.userId.toString(),
        userName: q.user.name,
        storeLocation: q.store.storeLocation,
        date: q.date.toISOString().split('T')[0],
        timeWindow: q.timewindow,
        reason: q.reason || '',
        status: q.status as 'pending' | 'approved' | 'rejected',
      }));

      return NextResponse.json(formatted,{status:200});
    } catch (err) {
      console.error(err);
      return NextResponse.json({ error: 'DB error' },{status:500});
    }
  }
}

export async function PUT(req: NextRequest){
  if (req.method === 'PUT') {
    const { id, status } = await req.json() as {
      id?: number;
      status?: string;
    };
    if (typeof id !== 'number' || !['approved', 'rejected'].includes(status || '')) {
      return NextResponse.json({ error: 'id (number) and valid status required' },{status : 400});
    }

    try {
      const updated = await prisma.quietTime.update({
        where: { id },
        data: { status }
      });

      return NextResponse.json({ message: 'Updated' },{status : 200});
    } catch (err: any) {
      console.error(err);
      if (err.code === 'P2025') {
        return NextResponse.json({ error: 'Not found' },{status : 404});
      }
      return NextResponse.json({ error: 'DB error' },{status : 500});
    }
  }
}
