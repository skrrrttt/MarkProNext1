import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/signup'];
  const isPublicRoute = publicRoutes.includes(path);

  // Protected routes
  const isAdminRoute = path.startsWith('/admin');
  const isFieldRoute = path.startsWith('/field');

  // If user is not logged in and trying to access protected routes
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user is logged in
  if (user) {
    // Get user role from user_profiles table
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.user_role;

    // Redirect to appropriate dashboard if on login page
    if (path === '/login' || path === '/') {
      if (userRole === 'admin' || userRole === 'office') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else if (userRole === 'field') {
        return NextResponse.redirect(new URL('/field/jobs', request.url));
      }
    }

    // Protect admin routes
    if (isAdminRoute && userRole !== 'admin' && userRole !== 'office') {
      return NextResponse.redirect(new URL('/field/jobs', request.url));
    }

    // Protect field routes
    if (isFieldRoute && userRole !== 'field') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
