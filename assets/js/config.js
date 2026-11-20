/* Ligação ao Supabase. Só chaves PÚBLICAS (anon/publishable) — nunca a service_role.
   Deixar url vazio, ou abrir a página com ?demo, para usar o modo de demonstração local. */
const SUPABASE={
  url:'https://grxbvpkdgvriwqvkbkyi.supabase.co',
  chave:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyeGJ2cGtkZ3ZyaXdxdmtia3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwOTU0NjMsImV4cCI6MjExMDY3MTQ2M30.SzMXywkVhm9-R3hehu9Q3luChoLlQg3bBYSzT8HU9ek'
};

/* Contactos mostrados na página inicial. Vazio = o botão/ícone não aparece.
   whatsapp: só números com indicativo, ex.: '258840000000' */
const CONTACTO={
  whatsapp:'',
  instagram:'',
  youtube:'',
  facebook:''
};
