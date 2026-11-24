/* =====================================================================
 * CONFIGURAÇÃO DESTE CLIENTE — único arquivo que muda de uma loja para outra
 * Pegue os dois valores no Supabase do cliente:
 *   Project Settings (engrenagem) > API Keys
 *   - url   : "Project URL"  (ex.: https://abcdxyz.supabase.co)
 *   - chave : "Publishable key" (começa com sb_publishable_...)
 *             (em projetos antigos pode ser a "anon public", começa com eyJ...)
 * NUNCA coloque aqui a "Secret key" / "service_role".
 * ===================================================================== */
window.CONFIG_SUPABASE = {
  url: 'https://COLOQUE-AQUI.supabase.co',
  chave: 'COLOQUE-AQUI-A-PUBLISHABLE-KEY'
};
