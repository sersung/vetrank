export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-background pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto prose prose-invert prose-sm">
        <h1 style={{ fontFamily: "Playfair Display, serif" }} className="text-3xl font-bold mb-2">
          Termos de Uso
        </h1>
        <p className="text-muted-foreground text-sm mb-8">Última atualização: 1º de maio de 2025</p>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">1. Aceitação dos Termos</h2>
          <p className="text-muted-foreground leading-relaxed">
            Ao acessar ou utilizar a plataforma VetRank, você concorda com estes Termos de Uso e com nossa Política de Privacidade. Se não concordar com qualquer parte destes termos, não utilize a plataforma.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">2. Descrição do Serviço</h2>
          <p className="text-muted-foreground leading-relaxed">
            O VetRank é uma plataforma gamificada de estudos para estudantes e profissionais de medicina veterinária, oferecendo banco de questões, simulados configuráveis, sistema de ranking e recursos de aprendizagem com inteligência artificial.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">3. Cadastro e Conta</h2>
          <p className="text-muted-foreground leading-relaxed">
            Para acessar os recursos da plataforma, você deve criar uma conta com informações verdadeiras e atualizadas. Você é responsável pela confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">4. Planos e Pagamentos</h2>
          <p className="text-muted-foreground leading-relaxed">
            O VetRank oferece um plano gratuito com acesso limitado e planos premium com acesso completo. O trial gratuito de 30 dias não requer cartão de crédito. Planos pagos são cobrados conforme descrito na página de preços. Cancelamentos podem ser realizados a qualquer momento, sem multa.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">5. Propriedade Intelectual</h2>
          <p className="text-muted-foreground leading-relaxed">
            Todo o conteúdo disponibilizado na plataforma, incluindo questões, textos, imagens e código, é de propriedade do VetRank ou de seus licenciadores. É proibida a reprodução, distribuição ou uso comercial sem autorização expressa.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">6. Conduta do Usuário</h2>
          <p className="text-muted-foreground leading-relaxed">
            É proibido utilizar a plataforma para: (a) violar leis aplicáveis; (b) compartilhar conteúdo ofensivo, discriminatório ou ilegal; (c) tentar comprometer a segurança da plataforma; (d) reproduzir ou distribuir questões sem autorização.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">7. Limitação de Responsabilidade</h2>
          <p className="text-muted-foreground leading-relaxed">
            O VetRank não garante que o serviço será ininterrupto ou livre de erros. O conteúdo educacional é fornecido para fins de estudo e não substitui orientação profissional ou acadêmica formal.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">8. Modificações</h2>
          <p className="text-muted-foreground leading-relaxed">
            Reservamo-nos o direito de modificar estes Termos a qualquer momento. Alterações significativas serão comunicadas via e-mail ou notificação na plataforma. O uso continuado após as alterações constitui aceitação dos novos termos.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">9. Lei Aplicável</h2>
          <p className="text-muted-foreground leading-relaxed">
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer controvérsias.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">10. Contato</h2>
          <p className="text-muted-foreground leading-relaxed">
            Para dúvidas sobre estes Termos, entre em contato pelo e-mail: <a href="mailto:contato@vetrank.com.br" className="text-primary hover:underline">contato@vetrank.com.br</a>
          </p>
        </section>
      </div>
    </div>
  );
}
