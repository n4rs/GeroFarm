# Pulverizações e aplicação de produtos

## Contrato de domínio

`Pulverização` e `Aplicação de produtos` são operações físicas realizadas. Cada registo tem os destinos efetivos na data, uma mistura única, vários produtos, pessoas, equipamentos e prestadores comuns. As vistas fitossanitária/FRAC, fertilização foliar e caderno são projeções do mesmo identificador de operação; não criam uma segunda mistura, consumo, stock, custo, nutriente ou entrada de caderno.

Uma pulverização exige volume de calda em L/ha. Cada produto conserva a origem quantitativa (dose/ha, dose/hL ou total), lote, substâncias ativas, registo, grupo FRAC quando aplicável e snapshots de autorização, uso, intervalo de segurança e reentrada por cultura e destino. Os valores calculados são fechados pelo servidor na operação concluída.

Os produtos fitofarmacêuticos exigem a avaliação do aplicador legal na data. Produtos não fitofarmacêuticos não exigem essa habilitação. Ausência ou invalidade da habilitação, autorização, limites, antirresistência, inspeção ou calibração geram avisos históricos não bloqueantes; a decisão do utilizador e a contagem dos avisos ficam na auditoria.

Adubos foliares e corretivos podem guardar a composição histórica. O balanço dos planos de fertilização lê uma projeção calculada diretamente dos produtos da pulverização e nunca persiste uma segunda operação de fertilização.

## Migração e retenção

`0014_product_applications.sql` é aditiva, aplica isolamento RLS por organização, referências às operações/trabalhadores e `REVOKE DELETE` ao papel da aplicação. Dados legais, composição, meteorologia, avisos e intervalos permanecem snapshots históricos.

## Dependência final do Gero Core

A estrutura aceita meteorologia com origem `gero_core`, `manual` ou `unavailable`, preserva o instante de observação e assinala alterações manuais. A obtenção automática do tempo e a sincronização dos catálogos legais ficam para a fase final do Gero Core. Até essa integração existir, a UI permite snapshots manuais/indisponíveis sem inventar autorizações nem alegações legais.

IRAC e HRAC estão deliberadamente fora desta fase; apenas FRAC é modelado.
