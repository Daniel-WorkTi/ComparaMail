import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export const metadata = {
  title: "Aviso legal e confidencialidade · ComparaJá",
  description: "Aviso legal e cláusula de confidencialidade das comunicações ComparaJá",
};

export default function AvisoLegalPage() {
  return (
    <div className="legal-page">
      <div className="legal-wrap">
        <Link href="/" className="legal-brand" aria-label="ComparaJá">
          <BrandLogo height={28} />
        </Link>
        <h1>Aviso legal e confidencialidade</h1>
        <div className="legal-body">
          <p>
            O ComparaJá atua como intermediário de crédito junto do Banco de Portugal para a
            prestação de serviços de consultoria e intermediação de crédito com o nº 0000375.{" "}
            <a
              href="https://www.bportugal.pt/intermediariocreditofar/comparaja-sa"
              target="_blank"
              rel="noopener noreferrer"
            >
              Saiba mais no Banco de Portugal
            </a>
            .
          </p>
          <p>
            Esta mensagem de correio electrónico, o seu conteúdo e os respectivos anexos, são
            confidenciais e destinam-se apenas ao conhecimento e uso exclusivo da(s) pessoa(s) nela
            indicada(s) como destinatária(s) e poderá conter dados pessoais e informação privada e
            privilegiada, confidencial ou legalmente protegida.
          </p>
          <p>
            Se a presente comunicação incluir dados pessoais, o(s) destinatário(s) está(ão)
            obrigado(s) ao cumprimento do disposto no Regulamento Geral de Proteção de Dados (UE)
            2016/679-PE/C de 2016/04/27 e demais legislação nacional de execução, devendo
            utilizá-las estritamente para as finalidades definidas e tratá-los em estrito cumprimento
            do referido Regulamento e demais legislação aplicável.
          </p>
          <p>
            Se não é o destinatário ou a pessoa autorizada a receber esta mensagem e a recebeu
            indevidamente, não pode usar, copiar, transmitir ou divulgar, seja por que meio for, as
            informações nela contidas ou tomar qualquer ação baseada nessas informações. Por favor,
            avise-nos imediatamente, respondendo ao e-mail e em seguida apague a mensagem e os
            respetivos anexos. Agradecemos a sua cooperação.
          </p>
        </div>
        <p className="legal-back">
          <Link href="/">← Voltar às assinaturas</Link>
        </p>
      </div>
    </div>
  );
}
