/**
 * lib/react.js — Single source of truth for all React + htm imports.
 *
 * Uses a custom createElement wrapper so component files can write
 * natural HTML attributes (class, style="...") and have them
 * automatically converted to what React requires (className, style={{}}).
 *
 * This means:
 *   class="foo bar"          → className="foo bar"
 *   style="color:red"        → style={{color:'red'}}
 *   style=${`color:${x}`}    → style={{color: x}}  (dynamic strings too)
 *
 * No changes needed in component files.
 */
import React, {
  useState, useEffect, useCallback,
  useRef, useMemo, useReducer, Component
} from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';

// ── CSS string → React style object ──────────────────────────────────────────
function parseStyle(css) {
  if (!css || typeof css !== 'string') return undefined;
  const obj = {};
  for (const decl of css.split(';')) {
    const colon = decl.indexOf(':');
    if (colon < 0) continue;
    const prop = decl.slice(0, colon).trim();
    const val  = decl.slice(colon + 1).trim();
    if (!prop || !val) continue;
    // camelCase conversion: border-radius → borderRadius
    const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    obj[camel] = val;
  }
  return obj;
}

// ── Custom createElement that normalises HTML attrs to React props ──────────
function h(type, props, ...children) {
  if (props && typeof props === 'object' && !Array.isArray(props)) {
    let needsCopy = false;
    // Check if any prop needs fixing before allocating a copy
    if ('class' in props) needsCopy = true;
    if (typeof props.style === 'string') needsCopy = true;

    if (needsCopy) {
      const fixed = { ...props };
      if ('class' in fixed) {
        fixed.className = fixed.class;
        delete fixed.class;
      }
      if (typeof fixed.style === 'string') {
        fixed.style = parseStyle(fixed.style);
      }
      return React.createElement(type, fixed, ...children);
    }
  }
  return React.createElement(type, props, ...children);
}

// Bind htm to our wrapper — single React instance, HTML-friendly attribute names
export const html = htm.bind(h);

export {
  React,
  useState, useEffect, useCallback,
  useRef, useMemo, useReducer, Component,
  createRoot,
};
