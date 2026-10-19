# Edge function tests (Deno)

Run a function's real `index.ts` against an in-memory Supabase (`supabase-mock.ts`,
mapped over `https://esm.sh/@supabase/supabase-js@2` by `import_map.json`).
Not deployed: this folder sits outside `supabase/functions/`. Files end in `.deno.ts`, not `.test.ts`, so `bun test` does not pick them up.

```sh
deno test --allow-env --import-map=supabase/function-tests/import_map.json supabase/function-tests/machinery-beta.deno.ts
```
