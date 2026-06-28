import { TestDriveWidget } from '../src/components/TestDriveWidget';

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backgroundColor: '#f4f7fb' }}>
      <TestDriveWidget vehicleType="tesla_model3" location="dublin" />
    </main>
  );
}
