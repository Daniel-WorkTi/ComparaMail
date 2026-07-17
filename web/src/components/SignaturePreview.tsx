type Props = {
  html: string;
  id?: string;
};

export function SignaturePreview({ html, id = "signature-preview" }: Props) {
  return (
    <iframe
      id={id}
      className="sig-preview-iframe"
      sandbox=""
      srcDoc={html}
      referrerPolicy="no-referrer"
      title="Pré-visualização da assinatura"
    />
  );
}
