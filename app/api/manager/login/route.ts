// pages/api/manager/login.ts
import prisma from '../../../../lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
) {

  const { managerEmail, managerPassword } = await req.json() as {
    managerEmail?: string;
    managerPassword?: string;
  };
  
  if (!managerEmail || !managerPassword) {
    return NextResponse.json({ error: 'Email and password required' },{status: 400});
  }

  try {
    const store = await prisma.store.findFirst({
      where: {
        managerEmail: managerEmail,
        managerPassword: managerPassword
      },
      select: {
        storeId: true,
        managerEmail: true,
        storeName: true,
        storeLocation: true,
      }
    });

    if (!store) {
      return NextResponse.json({ error: 'Invalid credentials' },{status : 401});
    }

    return NextResponse.json(store,{status : 200});
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Database error' },{status : 500});
  }
}
