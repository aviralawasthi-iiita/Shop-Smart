// pages/api/user/login.ts
import prisma from '../../../../lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
) {
  
  const { userEmail, password } = await req.json() as {
    userEmail?: string;
    password?: string;
  };

  if (!userEmail || !password) {
    return NextResponse.json({ error: 'Email and password required' }, {status: 400});
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        userEmail: userEmail,
        password: password
      },
      select: {
        userId: true,
        userEmail: true,
        name: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' },{status : 401});
    }

    return NextResponse.json(user);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Database error' },{status : 500});
  }
}
