type Props = {
  html: string;
  id?: string;
};

export function SignaturePreview({ html, id = "signature-preview" }: Props) {
  return (
    <div
      id={id}
      className="sig-preview-html"
      // HTML gerado pelo nosso template — conteúdo controlado
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
