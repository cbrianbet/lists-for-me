import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request) {
	let response = NextResponse.next();

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) => {
						response.cookies.set(name, value, options);
					});
				},
			},
		}
	);

	// ✅ Get logged in user
	const {
		data: { user },
	} = await supabase.auth.getUser();

	// If not logged in, allow access (or redirect if you want)
	if (!user) return response;

	// ✅ Onboarding check
	const { data: profile } = await supabase.from("profiles").select("has_onboarded").eq("id", user.id).single();

	if (profile && profile.has_onboarded === false && request.nextUrl.pathname !== "/onboarding") {
		return NextResponse.redirect(new URL("/onboarding", request.url));
	}

	return response;
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
