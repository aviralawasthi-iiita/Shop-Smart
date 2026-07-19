import prisma from '../../../../lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.ENCRYPTION_KEY || 'fallback_secret_key_that_is_32_chars_long');
    const { payload } = await jwtVerify(token, secret);

    if (!payload.managerEmail) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    const store = await prisma.store.findFirst({
      where: {
        managerEmail: payload.managerEmail as string,
      },
      select: {
        storeId: true,
        managerEmail: true,
        storeName: true,
        storeLocation: true,
      }
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    return NextResponse.json(store, { status: 200 });

  } catch (err) {
    console.error('Auth verification error:', err);
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
}
