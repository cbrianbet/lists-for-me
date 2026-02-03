import HomePage from "./HomePage";

// Force dynamic rendering to skip static generation
export const dynamic = "force-dynamic";

export default function Page() {
  return <HomePage />;
}
