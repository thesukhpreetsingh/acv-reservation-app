import Link from 'next/link';
import { TestDriveWidget } from '../src/components/TestDriveWidget';

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'linear-gradient(135deg, #f8fbff 0%, #eef4ff 45%, #f3f7fb 100%)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '1280px', display: 'grid', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link href="/admin" style={{ color: '#0f766e', fontWeight: 700, textDecoration: 'none' }}>
            Go to admin panel
          </Link>
        </div>
        <TestDriveWidget vehicleType="tesla_model3" location="dublin" />
      </div>
    </main>
  );
}
