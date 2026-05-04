import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Termos de Uso e Serviço</h1>
          <p className="text-muted-foreground text-sm">
            Última atualização: maio de 2026
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6 space-y-1 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Razão Social:</strong> CSVET Editora, Cursos e Treinamentos</p>
            <p><strong className="text-foreground">Nome Fantasia:</strong> CSVET / VetRank</p>
            <p><strong className="text-foreground">CNPJ:</strong> 32.645.724/0001-89</p>
            <p><strong className="text-foreground">E-mail de contato:</strong> adm@csvet.com.br</p>
          </CardContent>
        </Card>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar ou utilizar a plataforma VetRank, você declara ter lido, compreendido e concordado integralmente
              com estes Termos de Uso e com a nossa Política de Privacidade. Caso não concorde com qualquer disposição,
              você deve cessar imediatamente o uso da plataforma.
            </p>
            <p className="mt-2">
              O aceite eletrônico destes termos, realizado no momento do cadastro ou da ativação do período de teste,
              tem validade jurídica equivalente à assinatura manuscrita, nos termos do art. 10, §2º da Medida Provisória
              nº 2.200-2/2001 e do art. 784, inciso III do Código de Processo Civil.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Descrição do Serviço</h2>
            <p>
              O VetRank é uma plataforma educacional digital voltada à preparação de estudantes e profissionais de
              Medicina Veterinária para concursos públicos, residências e o exame do Conselho Federal de Medicina
              Veterinária (CFMV). Os serviços incluem banco de questões, simulados, trilhas de conhecimento, ranking
              e recursos de gamificação.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Período de Teste Gratuito (Trial)</h2>
            <p>
              Novos usuários têm direito a um período de teste gratuito de <strong className="text-foreground">7 (sete) dias</strong>,
              contados a partir da data de cadastro e aceite destes termos. Durante o período de teste, o usuário tem
              acesso às funcionalidades do plano selecionado sem cobrança.
            </p>
            <p className="mt-2">
              Ao final do período de teste, a assinatura é convertida automaticamente para o plano pago correspondente,
              com cobrança do valor integral. O usuário será notificado por e-mail antes do encerramento do período
              de teste.
            </p>
            <p className="mt-2">
              O cancelamento durante o período de teste deve ser realizado antes do término dos 7 dias para evitar
              a cobrança. O cancelamento pode ser feito diretamente na área de conta da plataforma ou pelo e-mail
              adm@csvet.com.br.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Política de Pagamento e Não Reembolso</h2>
            <p>
              Os pagamentos são processados pela plataforma <strong className="text-foreground">MercadoPago</strong>,
              serviço de pagamento eletrônico de terceiros, sujeito aos seus próprios termos e condições. A CSVET
              não armazena dados de cartão de crédito ou informações bancárias dos usuários.
            </p>
            <p className="mt-2">
              Nos termos do art. 49 do Código de Defesa do Consumidor (Lei nº 8.078/1990), o usuário tem o direito
              de desistência de 7 (sete) dias corridos a contar da data de contratação do serviço. Este direito é
              exercido durante o período de teste gratuito descrito na cláusula 3.
            </p>
            <p className="mt-2 font-medium text-foreground">
              Após o encerramento do período de teste gratuito de 7 dias e a efetivação do primeiro pagamento,
              não haverá reembolso de valores pagos, independentemente do motivo, incluindo desistência, não
              utilização do serviço ou insatisfação com o conteúdo.
            </p>
            <p className="mt-2">
              Esta política é aplicável porque o período de teste de 7 dias já garante ao consumidor o exercício
              pleno do direito de arrependimento previsto no Código de Defesa do Consumidor, antes de qualquer
              cobrança ser realizada.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Planos e Assinaturas</h2>
            <p>
              A plataforma oferece planos de assinatura mensal e anual. Os valores, benefícios e condições de cada
              plano estão descritos na página de Planos e Preços. A CSVET reserva-se o direito de alterar os valores
              dos planos mediante aviso prévio de 30 dias por e-mail.
            </p>
            <p className="mt-2">
              Assinaturas anuais têm desconto em relação ao plano mensal e são cobradas integralmente no ato da
              contratação, após o período de teste. Não há parcelamento disponível para o plano anual.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Programa de Indicações</h2>
            <p>
              O VetRank oferece um programa de indicações no qual usuários podem indicar novos assinantes. A bonificação
              (1 ano gratuito de acesso Premium) é concedida somente após 10 (dez) indicados efetivarem o pagamento de
              um plano pago, não sendo contabilizadas indicações que permaneçam apenas no período de teste gratuito.
            </p>
            <p className="mt-2">
              A CSVET reserva-se o direito de alterar, suspender ou encerrar o programa de indicações a qualquer momento,
              com aviso prévio de 15 dias aos participantes ativos.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo disponível na plataforma VetRank, incluindo questões, explicações, trilhas de conhecimento,
              textos, imagens, logotipos e código-fonte, é de propriedade exclusiva da CSVET Editora, Cursos e
              Treinamentos, protegido pela Lei nº 9.610/1998 (Lei de Direitos Autorais).
            </p>
            <p className="mt-2">
              É expressamente proibido reproduzir, distribuir, transmitir, exibir, vender, licenciar ou explorar
              comercialmente qualquer conteúdo da plataforma sem autorização prévia e escrita da CSVET. A violação
              desta cláusula sujeitará o infrator às sanções civis e penais cabíveis.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Limitação de Responsabilidade</h2>
            <p>
              O conteúdo disponibilizado na plataforma tem finalidade exclusivamente educacional e de preparação
              para avaliações. A CSVET não garante aprovação em concursos, residências ou exames, nem se responsabiliza
              por decisões tomadas com base no conteúdo da plataforma.
            </p>
            <p className="mt-2">
              A CSVET não se responsabiliza por falhas técnicas, interrupções de serviço, perda de dados ou danos
              decorrentes do uso da plataforma, exceto nos casos expressamente previstos em lei. O serviço é fornecido
              "no estado em que se encontra" (as-is), sem garantias de disponibilidade ininterrupta.
            </p>
            <p className="mt-2">
              Em nenhuma hipótese a responsabilidade total da CSVET perante o usuário excederá o valor pago pelo
              usuário nos últimos 3 (três) meses de assinatura.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Conduta do Usuário</h2>
            <p>O usuário compromete-se a:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Não compartilhar suas credenciais de acesso com terceiros;</li>
              <li>Não utilizar a plataforma para fins ilícitos ou que violem direitos de terceiros;</li>
              <li>Não tentar acessar áreas restritas ou sistemas da plataforma de forma não autorizada;</li>
              <li>Não reproduzir, copiar ou distribuir questões ou conteúdos da plataforma;</li>
              <li>Fornecer informações verdadeiras e atualizadas no cadastro.</li>
            </ul>
            <p className="mt-2">
              O descumprimento destas obrigações poderá resultar na suspensão ou cancelamento imediato da conta,
              sem direito a reembolso, e na responsabilização civil e penal do usuário.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">10. Certificados de Conclusão</h2>
            <p>
              Os certificados emitidos pela plataforma VetRank ao término das Trilhas do Conhecimento têm caráter
              de certificado de curso livre de extensão, emitido pela CSVET Editora, Cursos e Treinamentos,
              CNPJ 32.645.724/0001-89. Os certificados não substituem diplomas de graduação, pós-graduação ou
              habilitações profissionais regulamentadas pelo CFMV.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">11. Privacidade e Proteção de Dados</h2>
            <p>
              O tratamento de dados pessoais dos usuários é realizado em conformidade com a Lei Geral de Proteção
              de Dados (Lei nº 13.709/2018 — LGPD). As informações coletadas são utilizadas exclusivamente para
              a prestação dos serviços contratados e melhoria da plataforma. Para mais detalhes, consulte nossa{" "}
              <a href="/privacy" className="text-primary hover:underline">Política de Privacidade</a>.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">12. Alterações nos Termos</h2>
            <p>
              A CSVET reserva-se o direito de modificar estes Termos de Uso a qualquer momento. As alterações
              serão comunicadas por e-mail e/ou notificação na plataforma com antecedência mínima de 10 dias.
              O uso continuado da plataforma após a vigência das alterações implica aceitação dos novos termos.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">13. Foro e Lei Aplicável</h2>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Para dirimir quaisquer
              controvérsias decorrentes deste instrumento, fica eleito o foro da Comarca de domicílio da CSVET,
              com renúncia expressa a qualquer outro, por mais privilegiado que seja.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">14. Contato</h2>
            <p>
              Para dúvidas, reclamações ou solicitações relacionadas a estes Termos de Uso, entre em contato
              pelo e-mail{" "}
              <a href="mailto:adm@csvet.com.br" className="text-primary hover:underline">adm@csvet.com.br</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
