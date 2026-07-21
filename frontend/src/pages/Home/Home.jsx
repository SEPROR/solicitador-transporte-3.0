import  Header from '../../components/Header';
import TicketForm from '../../components/TicketForm';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
      <Header />
      <main className="px-6 py-12">
        <TicketForm />
      </main>
    </div>
  );
}