import './globals.css';
import AppShell from '@/components/AppShell';
import { getSession } from '@/lib/auth';

export default async function RootLayout({ children }) {
  const session = await getSession();

  return (
    <html lang="en">
      <head>
        <title>WATI CRM — WhatsApp Lead Management</title>
        <meta name="description" content="CRM dashboard for managing leads from multiple WhatsApp numbers" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div className="app-layout">
          <AppShell session={session}>
            {children}
          </AppShell>
        </div>
      </body>
    </html>
  );
}
