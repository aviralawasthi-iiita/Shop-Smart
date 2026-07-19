import prisma from '../../../../lib/db';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

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
      },
      select: {
        storeId: true,
        managerEmail: true,
        storeName: true,
        storeLocation: true,
        managerPassword: true,
      }
    });

    if (!store) {
      return NextResponse.json({ error: 'Invalid credentials' },{status : 401});
    }

    const isPasswordValid = await bcrypt.compare(managerPassword, store.managerPassword);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' },{status : 401});
    }

    // Generate JWT
    const secret = new TextEncoder().encode(process.env.ENCRYPTION_KEY || 'fallback_secret_key_that_is_32_chars_long');
    const token = await new SignJWT({ storeId: store.storeId, managerEmail: store.managerEmail })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secret);

    // Set HttpOnly Cookie
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Exclude password from the returned object
    const { managerPassword: _, ...storeWithoutPassword } = store;

    return NextResponse.json(storeWithoutPassword,{status : 200});
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Database error' },{status : 500});
  }
}
