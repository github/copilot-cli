import Link from 'next/link';
import { Dumbbell, Target, TrendingUp, MessageCircle } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-td-bg-white to-td-bg-secondary">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-headings font-bold text-td-blue-dark mb-6">
            TD FITNESS
          </h1>
          <p className="text-2xl md:text-3xl text-td-blue-text font-semibold mb-4">
            Consultoria Online de Elite
          </p>
          <p className="text-lg text-td-text-secondary mb-8 max-w-2xl mx-auto">
            Treinamento personalizado com Personal Trainer CREF 7-016401-G/DF
            com 27 anos de experiência, incluindo treinamento em Forças Armadas dos EUA (USMC)
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/cadastro"
              className="px-8 py-4 bg-td-cta-orange text-white font-headings text-lg rounded-lg hover:bg-opacity-90 transition-all transform hover:scale-105"
            >
              COMEÇAR AGORA
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-4 bg-td-blue-display text-white font-headings text-lg rounded-lg hover:bg-opacity-90 transition-all"
            >
              JÁ TENHO CONTA
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20">
          <FeatureCard
            icon={<Target className="w-12 h-12 text-td-blue-display" />}
            title="Treino Personalizado"
            description="Programa de treino 100% customizado para seus objetivos e nível de experiência"
          />
          <FeatureCard
            icon={<Dumbbell className="w-12 h-12 text-td-blue-display" />}
            title="900+ Exercícios"
            description="Biblioteca completa com vídeos demonstrativos e instruções detalhadas"
          />
          <FeatureCard
            icon={<TrendingUp className="w-12 h-12 text-td-blue-display" />}
            title="Tracking de Progresso"
            description="Acompanhe peso, medidas, fotos e evolução de carga em tempo real"
          />
          <FeatureCard
            icon={<MessageCircle className="w-12 h-12 text-td-blue-display" />}
            title="Suporte Direto"
            description="Chat em tempo real com o Treinador David para tirar dúvidas"
          />
        </div>

        {/* Pricing Preview */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-headings font-bold text-td-blue-dark mb-12">
            PLANOS DISPONÍVEIS
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Avaliação Inicial"
              price="R$ 197"
              duration="60 minutos"
              features={[
                "Análise completa de objetivos",
                "Avaliação de condição física",
                "Plano de ação personalizado",
                "7 dias de suporte via chat"
              ]}
            />
            <PricingCard
              name="Consultoria Mensal"
              price="R$ 697"
              duration="4 sessões/mês"
              features={[
                "4 consultorias online (60min)",
                "Programa de treino personalizado",
                "Chat ilimitado",
                "Ajustes semanais no programa"
              ]}
              featured
            />
            <PricingCard
              name="Programa sem Call"
              price="R$ 397"
              duration="único"
              features={[
                "Programa de treino completo",
                "Acesso à biblioteca completa",
                "3 mensagens de suporte",
                "Atualizações mensais"
              ]}
            />
          </div>
        </div>

        {/* CTA Footer */}
        <div className="mt-20 text-center bg-td-blue-dark text-white rounded-2xl p-12">
          <h2 className="text-4xl font-headings font-bold mb-4">
            PRONTO PARA TRANSFORMAR SEU CORPO?
          </h2>
          <p className="text-xl mb-8 text-gray-300">
            Junte-se a centenas de clientes que já alcançaram seus objetivos
          </p>
          <Link
            href="/auth/cadastro"
            className="inline-block px-12 py-5 bg-td-cta-orange text-white font-headings text-xl rounded-lg hover:bg-opacity-90 transition-all transform hover:scale-105"
          >
            COMEÇAR MINHA TRANSFORMAÇÃO 🔥
          </Link>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-headings font-bold text-td-blue-dark mb-2">{title}</h3>
      <p className="text-td-text-secondary">{description}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  duration,
  features,
  featured = false
}: {
  name: string;
  price: string;
  duration: string;
  features: string[];
  featured?: boolean;
}) {
  return (
    <div className={`bg-white p-8 rounded-xl shadow-lg ${featured ? 'ring-4 ring-td-cta-orange transform scale-105' : ''}`}>
      {featured && (
        <div className="bg-td-cta-orange text-white text-sm font-bold py-1 px-4 rounded-full inline-block mb-4">
          MAIS POPULAR
        </div>
      )}
      <h3 className="text-2xl font-headings font-bold text-td-blue-dark mb-2">{name}</h3>
      <div className="text-4xl font-bold text-td-blue-display mb-2">{price}</div>
      <div className="text-td-text-secondary mb-6">{duration}</div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start">
            <svg className="w-5 h-5 text-td-success-green mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-td-text-secondary">{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/auth/cadastro"
        className={`block w-full text-center py-3 rounded-lg font-headings font-bold transition-all ${
          featured
            ? 'bg-td-cta-orange text-white hover:bg-opacity-90'
            : 'bg-td-bg-secondary text-td-blue-text hover:bg-td-blue-display hover:text-white'
        }`}
      >
        ESCOLHER PLANO
      </Link>
    </div>
  );
}
