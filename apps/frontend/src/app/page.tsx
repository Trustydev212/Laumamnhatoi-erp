import { redirect } from 'next/navigation';

export default async function HomePage() {
  // This will be handled by middleware for authentication
  redirect('/dashboard');
}
