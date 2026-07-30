import { redirect } from 'next/navigation';

/**
 * Nothing lives at the root. Middleware has already decided whether there is a
 * session, so anyone reaching here has one -- send them where the work happens.
 */
export default function RootPage() {
  redirect('/scan');
}
