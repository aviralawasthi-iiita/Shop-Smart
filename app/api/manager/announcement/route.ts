import prisma from '../../../../lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { producer } from '@/lib/kafka';

export async function POST(
  req: NextRequest,
) {
  if (req.method === 'POST') {
    const { title, descrip, storeId } = await req.json() as {
      title?: string;
      descrip?: string;
      storeId?: number;
    };
    if (!title || typeof storeId !== 'number') {
      return NextResponse.json({ error: 'title and storeId (number) required' },{status: 400});
    }

    try {
      const announcement = await prisma.announcement.create({
        data: {
          title,
          descrip: descrip || null,
          storeId
        }
      });

      // Produce event to Kafka
      await producer.send({
        topic: "store-announcements",
        messages: [
          {
            value: JSON.stringify({
              id: announcement.id,
              title: announcement.title,
              descrip: announcement.descrip,
              storeId: announcement.storeId,
              createdAt: announcement.created_at,
            }),
          },
        ],
      });

      return NextResponse.json({ insertedId: announcement.id }, {status : 201});
    } catch (err) {
      console.error(err);
      return NextResponse.json({ error: 'DB error' }, {status : 500});
    }
  }

}

export async function GET(req: NextRequest){
  if (req.method === 'GET') {
    try {
      const announcements = await prisma.announcement.findMany({
        orderBy: {
          created_at: 'desc'
        }
      });
      
      const formatted = announcements.map(r => ({
        id: r.id,
        title: r.title,
        descrip: r.descrip,
        storeId: r.storeId,
        createdAt: r.created_at
      }));
      return NextResponse.json(formatted, {status : 200});
    } catch (err) {
      console.error(err);
      return NextResponse.json({ error: 'DB error' }, {status : 500});
    }
  }
}
