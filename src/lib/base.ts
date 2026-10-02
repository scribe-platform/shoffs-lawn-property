// Every internal link/asset path in this template is written as root-
// relative ("/blog", "/uploads/x.jpg") in content and components, but a
// github.io project page serves from a subpath (base="/repo-name") rather
// than "/" (see astro.config.mjs). Route every such path through here so
// it resolves correctly under either base.
export function url(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}
