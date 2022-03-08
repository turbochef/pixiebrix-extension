/*
 * Copyright (C) 2022 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// https://stackoverflow.com/questions/43638454/webpack-typescript-image-import
declare module "*.svg" {
  const CONTENT: string;
  export default CONTENT;
}

declare module "*?loadAsUrl" {
  const CONTENT: string;
  export default CONTENT;
}

declare module "*?loadAsText" {
  const CONTENT: string;
  export default CONTENT;
}

// Loading svg as React component using @svgr
declare module "*.svg?loadAsComponent" {
  import React from "react";

  const SVG: React.VFC<React.SVGProps<SVGSVGElement>>;
  export default SVG;
}

declare module "*.txt" {
  const CONTENT: string;
  export default CONTENT;
}

declare module "*.yaml" {
  const CONTENT: Record<string, unknown>;
  export default CONTENT;
}

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}
declare module "*.module.scss" {
  const classes: Record<string, string>;
  export default classes;
}

// Package has no types: https://github.com/guiyep/react-select-virtualized/issues/293
declare module "react-select-virtualized" {
  export { default } from "react-select";
}

declare module "generate-schema" {
  import { UnknownObject } from "@/types";

  const json: (title: string, obj: unknown) => UnknownObject;
}

// From https://github.com/mozilla/page-metadata-parser/issues/116#issuecomment-614882830
declare module "page-metadata-parser" {
  export type IPageMetadata = Record<string, string | string[]>;

  export type PageMetadataRule = [
    string,
    (element: HTMLElement) => string | null
  ];

  export function getMetadata(
    doc: Document | HTMLElement,
    url: string,
    customRuleSets?: Record<string, PageMetadataRule>
  ): IPageMetadata;
}

declare module "@/vendors/initialize" {
  import { Promisable } from "type-fest";

  /** Attach a MutationObserver specifically for a selector */
  const initialize: (
    selector: string,
    callback: (
      this: Element,
      index: number,
      element: Element
    ) => Promisable<void | false>,
    options: { target: Element | Document; observer?: MutationObserverInit }
  ) => MutationObserver;

  export default initialize;
}

// Missing from TS types, but it's a standard
interface HTMLDialogElement extends HTMLElement {
  showModal(): void;
}

// Made available via: "jest-environment-jsdom-global" for jest tests
declare const jsdom: {
  reconfigure: (options: { url: string }) => void;
};

// `useUnknownInCatchVariables` for .catch method https://github.com/microsoft/TypeScript/issues/45602
interface Promise<T> {
  /**
   * Attaches a callback for only the rejection of the Promise.
   * @param onrejected The callback to execute when the Promise is rejected.
   * @returns A Promise for the completion of the callback.
   */
  catch<TResult = never>(
    onrejected?:
      | ((reason: unknown) => TResult | PromiseLike<TResult>)
      | undefined
      | null
  ): Promise<T | TResult>;
}