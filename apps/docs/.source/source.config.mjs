// source.config.ts
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { z } from "zod";
var { docs, meta } = defineDocs({
  docs: {
    schema: z.object({
      title: z.string(),
      description: z.string(),
      icon: z.string().optional(),
      full: z.boolean().optional(),
      index: z.boolean().optional()
    })
  },
  meta: {
    schema: z.object({
      title: z.string(),
      description: z.string().optional(),
      icon: z.string().optional(),
      pages: z.array(z.string()).optional()
    })
  }
});
var source_config_default = defineConfig({
  lastModifiedTime: "git",
  mdxOptions: {
    remarkPlugins: [],
    rehypePlugins: []
  }
});
export {
  source_config_default as default,
  docs,
  meta
};
