#!/usr/bin/env node
/**
 * Regenerates AUTO-GENERATED sections in COMPONENT_TREE.md
 * by tracing JSX component imports from client/src/main.tsx.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const CLIENT_SRC = path.join(REPO_ROOT, "client", "src");
const DOC_PATH = path.join(REPO_ROOT, "COMPONENT_TREE.md");

const ENTRY_FILE = path.join(CLIENT_SRC, "main.tsx");

const MARKERS = {
  ascii: {
    start: "<!-- component-tree:ascii:start -->",
    end: "<!-- component-tree:ascii:end -->",
  },
  orphans: {
    start: "<!-- component-tree:orphans:start -->",
    end: "<!-- component-tree:orphans:end -->",
  },
};

/** @type {Set<string>} */
const EXTERNAL_PREFIXES = new Set([
  "react",
  "react-dom",
  "react-redux",
  "@reduxjs/toolkit",
  "@tanstack/react-query",
  "wouter",
  "framer-motion",
  "lucide-react",
  "react-icons",
  "recharts",
  "embla-carousel-react",
  "vaul",
  "cmdk",
  "input-otp",
  "react-day-picker",
  "react-hook-form",
  "react-resizable-panels",
  "next-themes",
  "@radix-ui",
  "@hookform",
  "class-variance-authority",
  "clsx",
  "tailwind-merge",
  "date-fns",
  "zod",
  "dompurify",
  "nanoid",
]);

function isExternal(specifier) {
  if (specifier.startsWith(".") || specifier.startsWith("@/")) return false;
  for (const prefix of EXTERNAL_PREFIXES) {
    if (specifier === prefix || specifier.startsWith(`${prefix}/`)) return true;
  }
  return !specifier.startsWith("@/") && !specifier.startsWith(".");
}

function resolveModule(specifier, fromFile) {
  if (isExternal(specifier)) return null;

  let base;
  if (specifier.startsWith("@/")) {
    base = path.join(CLIENT_SRC, specifier.slice(2));
  } else {
    base = path.resolve(path.dirname(fromFile), specifier);
  }

  const candidates = [
    base,
    `${base}.tsx`,
    `${base}.ts`,
    path.join(base, "index.tsx"),
    path.join(base, "index.ts"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.normalize(candidate);
    }
  }
  return null;
}

/**
 * @param {string} content
 * @returns {Map<string, string>} localName -> absolute file path
 */
function parseImports(content, fromFile) {
  /** @type {Map<string, string>} */
  const map = new Map();

  const importRe =
    /import\s+(?:type\s+)?(?:(\*\s+as\s+(\w+))|(?:\{([^}]+)\})|(\w+))\s+from\s+['"]([^'"]+)['"]/g;

  let match;
  while ((match = importRe.exec(content)) !== null) {
    const namespace = match[2];
    const named = match[3];
    const defaultName = match[4];
    const specifier = match[5];
    const resolved = resolveModule(specifier, fromFile);
    if (!resolved) continue;

    if (namespace) {
      map.set(namespace, resolved);
      continue;
    }
    if (defaultName) {
      map.set(defaultName, resolved);
      continue;
    }
    if (named) {
      for (const part of named.split(",")) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const aliasMatch = trimmed.match(/^(\w+)\s+as\s+(\w+)$/);
        if (aliasMatch) {
          map.set(aliasMatch[2], resolved);
        } else {
          const name = trimmed.split(/\s+/)[0];
          if (name) map.set(name, resolved);
        }
      }
    }
  }

  return map;
}

const SKIP_COMPONENTS = new Set([
  "Provider",
  "QueryClientProvider",
  "Switch",
  "Route",
  "Suspense",
  "Fragment",
  "AnimatePresence",
  "LayoutGroup",
]);

/**
 * @param {string} content
 * @returns {Set<string>}
 */
function parseLocalFunctionComponents(content) {
  const names = new Set();
  const re = /(?:export\s+)?function\s+([A-Z][A-Za-z0-9]*)\s*\(/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    names.add(m[1]);
  }
  return names;
}

/**
 * @param {string} content
 * @param {string} fnName
 * @returns {string | null}
 */
function extractFunctionBody(content, fnName) {
  const fnStart = content.search(
    new RegExp(`(?:export\\s+)?function\\s+${fnName}\\s*\\(`)
  );
  if (fnStart === -1) return null;

  const parenStart = content.indexOf("(", fnStart);
  if (parenStart === -1) return null;

  let parenDepth = 0;
  let parenEnd = -1;
  for (let i = parenStart; i < content.length; i++) {
    const ch = content[i];
    if (ch === "(") parenDepth += 1;
    if (ch === ")") {
      parenDepth -= 1;
      if (parenDepth === 0) {
        parenEnd = i;
        break;
      }
    }
  }
  if (parenEnd === -1) return null;

  const braceStart = content.indexOf("{", parenEnd);
  if (braceStart === -1) return null;

  let braceDepth = 0;
  for (let i = braceStart; i < content.length; i++) {
    const ch = content[i];
    if (ch === "{") braceDepth += 1;
    if (ch === "}") {
      braceDepth -= 1;
      if (braceDepth === 0) {
        return content.slice(braceStart + 1, i);
      }
    }
  }
  return null;
}

/**
 * @param {string} content
 * @returns {Set<string>}
 */
function parseJsxComponentNames(content) {
  const names = new Set();
  const tagRe = /<([A-Z][A-Za-z0-9]*)\b/g;
  let m;
  while ((m = tagRe.exec(content)) !== null) {
    if (!SKIP_COMPONENTS.has(m[1])) names.add(m[1]);
  }

  const componentPropRe = /component=\{([A-Z][A-Za-z0-9]*)\}/g;
  while ((m = componentPropRe.exec(content)) !== null) {
    names.add(m[1]);
  }

  return names;
}

/**
 * @param {string} content
 * @param {string} fromFile
 * @param {Map<string, string>} imports
 * @returns {Map<string, string>} componentName -> file path
 */
function parseLazyImportTargets(content, fromFile) {
  /** @type {Map<string, string>} */
  const map = new Map();
  const lazyRe =
    /const\s+(\w+)\s*=\s*lazy\s*\(\s*\(\)\s*=>\s*import\s*\(\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = lazyRe.exec(content)) !== null) {
    const name = m[1];
    const resolved = resolveModule(m[2], fromFile);
    if (resolved) map.set(name, resolved);
  }
  return map;
}

function buildImportMap(content, filePath) {
  const imports = parseImports(content, filePath);
  const lazyTargets = parseLazyImportTargets(content, filePath);
  for (const [name, target] of lazyTargets) {
    imports.set(name, target);
  }
  return imports;
}

/**
 * @param {string} scanContent
 * @param {Map<string, string>} imports
 * @param {Set<string>} localFns
 * @returns {{ name: string; file: string | null; localFn: string | null }[]}
 */
function refsFromContent(scanContent, imports, localFns) {
  /** @type {{ name: string; file: string | null; localFn: string | null }[]} */
  const refs = [];
  const seen = new Set();

  for (const name of parseJsxComponentNames(scanContent)) {
    if (SKIP_COMPONENTS.has(name) || seen.has(name)) continue;
    seen.add(name);

    if (imports.has(name)) {
      refs.push({ name, file: imports.get(name), localFn: null });
    } else if (localFns.has(name)) {
      refs.push({ name, file: null, localFn: name });
    }
  }

  return refs;
}

/**
 * @param {string} content
 * @param {string} filePath
 * @returns {string}
 */
function getComponentScanScope(content, filePath) {
  const defaultFn = content.match(/export\s+default\s+function\s+(\w+)/);
  if (defaultFn) {
    const body = extractFunctionBody(content, defaultFn[1]);
    if (body) return body;
  }

  const namedExportFn = content.match(/export\s+function\s+(\w+)/);
  if (namedExportFn) {
    const body = extractFunctionBody(content, namedExportFn[1]);
    if (body) return body;
  }

  const base = path.basename(filePath, path.extname(filePath));
  const pascal = base
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  const body = extractFunctionBody(content, pascal);
  if (body) return body;

  return content;
}

/**
 * @param {string} filePath
 * @param {string} content
 * @returns {{ name: string; file: string | null; localFn: string | null }[]}
 */
function collectTopLevelRefs(filePath, content) {
  const imports = buildImportMap(content, filePath);
  const localFns = parseLocalFunctionComponents(content);
  const scope = getComponentScanScope(content, filePath);
  return refsFromContent(scope, imports, localFns);
}

/**
 * @param {string} filePath
 * @param {string} content
 * @param {string} localFnName
 * @returns {{ name: string; file: string | null; localFn: string | null }[]}
 */
function collectNestedRefs(filePath, content, localFnName) {
  const imports = buildImportMap(content, filePath);
  const localFns = parseLocalFunctionComponents(content);
  const body = extractFunctionBody(content, localFnName);
  if (!body) return [];
  return refsFromContent(body, imports, localFns);
}

/**
 * @param {string} filePath
 * @param {string} content
 * @returns {{ name: string; file: string | null; localFn: string | null }[]}
 */
function collectAllRefs(filePath, content) {
  const top = collectTopLevelRefs(filePath, content);
  const all = [...top];

  for (const ref of top) {
    if (!ref.localFn) continue;
    for (const nested of collectNestedRefs(filePath, content, ref.localFn)) {
      if (!nested.file) continue;
      all.push(nested);
    }
  }

  return all;
}

function isComponentFile(filePath) {
  return filePath.endsWith(".tsx");
}

function getDisplayName(filePath) {
  const rel = path.relative(CLIENT_SRC, filePath).replace(/\\/g, "/");
  const base = path.basename(filePath, path.extname(filePath));
  const pascal =
    base
      .split(/[-_]/)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("") || base;
  if (rel.includes("components/ui/")) return `${pascal} (ui)`;
  if (rel.startsWith("pages/")) return `${pascal} [page]`;
  return pascal;
}

/**
 * @param {string} filePath
 * @param {Set<string>} visitedFiles
 * @returns {TreeNode}
 */
/**
 * @param {string} filePath
 * @param {Set<string>} visitedFiles
 * @param {Set<string>} [visitedLocalFns]
 * @returns {TreeNode}
 */
function buildTree(filePath, visitedFiles, visitedLocalFns = new Set()) {
  const display = getDisplayName(filePath);
  const rel = path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");

  if (!fs.existsSync(filePath)) {
    return { label: display, file: rel, children: [] };
  }

  const content = fs.readFileSync(filePath, "utf8");
  const refs = collectTopLevelRefs(filePath, content);

  /** @type {Map<string, TreeNode>} */
  const childByName = new Map();

  for (const ref of refs.sort((a, b) => a.name.localeCompare(b.name))) {
    if (childByName.has(ref.name)) continue;

    if (ref.localFn) {
      const nestedRefs = collectNestedRefs(filePath, content, ref.localFn);
      /** @type {TreeNode[]} */
      const localChildren = [];

      for (const nested of nestedRefs.sort((a, b) => a.name.localeCompare(b.name))) {
        if (!nested.file || !isComponentFile(nested.file)) continue;

        if (visitedFiles.has(nested.file)) {
          localChildren.push({
            label: `${nested.name} (cycle)`,
            file: path.relative(REPO_ROOT, nested.file).replace(/\\/g, "/"),
            children: [],
          });
          continue;
        }

        visitedFiles.add(nested.file);
        const subtree = buildTree(nested.file, visitedFiles, visitedLocalFns);
        subtree.label = nested.name;
        localChildren.push(subtree);
        visitedFiles.delete(nested.file);
      }

      childByName.set(ref.name, {
        label: ref.name,
        file: rel,
        children: localChildren,
      });
      continue;
    }

    const childFile = ref.file;
    if (!childFile || !isComponentFile(childFile)) continue;

    if (visitedFiles.has(childFile)) {
      childByName.set(ref.name, {
        label: `${ref.name} (cycle)`,
        file: path.relative(REPO_ROOT, childFile).replace(/\\/g, "/"),
        children: [],
      });
      continue;
    }

    visitedFiles.add(childFile);
    const subtree = buildTree(childFile, visitedFiles, visitedLocalFns);
    subtree.label = ref.name;
    childByName.set(ref.name, subtree);
    visitedFiles.delete(childFile);
  }

  return {
    label: display,
    file: rel,
    children: [...childByName.values()],
  };
}

/**
 * @param {TreeNode} node
 * @param {string} prefix
 * @param {boolean} isLast
 * @returns {string[]}
 */
function renderAscii(node, prefix = "", isLast = true) {
  const connector = isLast ? "└── " : "├── ";
  const lines = [`${prefix}${connector}${node.label}`];

  const childPrefix = prefix + (isLast ? "    " : "│   ");
  node.children.forEach((child, index) => {
    const last = index === node.children.length - 1;
    lines.push(...renderAscii(child, childPrefix, last));
  });

  return lines;
}

function collectAllComponentFiles() {
  /** @type {string[]} */
  const files = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
        files.push(path.normalize(full));
      }
    }
  }

  walk(path.join(CLIENT_SRC, "components"));
  walk(path.join(CLIENT_SRC, "pages"));
  return files;
}

function collectReachableFiles() {
  /** @type {Set<string>} */
  const reachable = new Set();

  function visit(filePath) {
    if (!fs.existsSync(filePath) || reachable.has(filePath)) return;
    reachable.add(filePath);

    const content = fs.readFileSync(filePath, "utf8");
    const refs = collectAllRefs(filePath, content);

    for (const ref of refs) {
      if (ref.file && isComponentFile(ref.file)) {
        visit(ref.file);
      }
    }
  }

  if (fs.existsSync(ENTRY_FILE)) visit(ENTRY_FILE);

  return reachable;
}

function formatOrphansSection() {
  const reachable = collectReachableFiles();
  const all = collectAllComponentFiles();

  const featureOrphans = [];
  const uiOrphans = [];

  for (const file of all) {
    if (reachable.has(file)) continue;
    const rel = path.relative(REPO_ROOT, file).replace(/\\/g, "/");
    if (rel.includes("/components/ui/")) {
      uiOrphans.push(rel);
    } else {
      featureOrphans.push(rel);
    }
  }

  featureOrphans.sort();
  uiOrphans.sort();

  const lines = [];

  if (featureOrphans.length === 0) {
    lines.push("_Нет orphan feature-компонентов._");
  } else {
    lines.push(
      `**Feature / pages (${featureOrphans.length})** — не достижимы из \`main.tsx\`:`,
      "",
      ...featureOrphans.map((f) => `- \`${f}\``)
    );
  }

  lines.push("", `**UI library (${uiOrphans.length})** — shadcn-файлы, не импортированные в активное дерево:`, "");

  if (uiOrphans.length <= 8) {
    lines.push(...uiOrphans.map((f) => `- \`${f}\``));
  } else {
    lines.push(
      ...uiOrphans.slice(0, 5).map((f) => `- \`${f}\``),
      `- _…и ещё ${uiOrphans.length - 5} файлов в \`client/src/components/ui/\`_`
    );
  }

  lines.push("");
  return lines.join("\n");
}

function buildForest() {
  if (!fs.existsSync(ENTRY_FILE)) {
    throw new Error(`Entry file not found: ${ENTRY_FILE}`);
  }
  const visited = new Set([ENTRY_FILE]);
  const root = buildTree(ENTRY_FILE, visited);
  root.label = "main.tsx";
  return [root];
}

function formatGeneratedTree() {
  const now = new Date().toISOString();
  const forest = buildForest();

  const lines = [
    `_Сгенерировано: ${now}_`,
    "",
    "```",
    "main.tsx (entry)",
  ];

  const root = forest[0];
  if (root?.children?.length === 1) {
    const ascii = renderAscii(root.children[0], "", true);
    lines.push(...ascii);
  } else if (root) {
    const ascii = renderAscii(root, "", true);
    lines.push(...ascii);
  }

  lines.push("```", "");
  return lines.join("\n");
}


function replaceBlock(content, startMarker, endMarker, replacement) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Markers not found: ${startMarker} / ${endMarker}`);
  }
  const before = content.slice(0, start + startMarker.length);
  const after = content.slice(end);
  return `${before}\n\n${replacement.trim()}\n\n${after}`;
}

function main() {
  let doc = fs.readFileSync(DOC_PATH, "utf8");
  doc = replaceBlock(
    doc,
    MARKERS.ascii.start,
    MARKERS.ascii.end,
    formatGeneratedTree()
  );
  doc = replaceBlock(
    doc,
    MARKERS.orphans.start,
    MARKERS.orphans.end,
    formatOrphansSection()
  );
  fs.writeFileSync(DOC_PATH, doc, "utf8");
  console.log(`Updated ${path.relative(REPO_ROOT, DOC_PATH)}`);
}

main();

/**
 * @typedef {{ label: string; file: string; children: TreeNode[] }} TreeNode
 */
