import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware com Mock Mode habilitado para testes locais
 * sem necessidade de conectar banco ou Supabase agora.
 */
export async function middleware(request: NextRequest) {
  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/forgot-password") ||
    request.nextUrl.pathname.startsWith("/reset-password");

  // Se o usuário acessar a tela de login durante os testes mock, pode acessar livremente,
  // ou pode navegar diretamente em todas as rotas do painel /
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
