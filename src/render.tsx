/**
 * Render helpers for converting JSON Schema to JSX (Hono) form elements.
 *
 * DOM contract (stable, addressable via `data-*` — no class names are emitted,
 * so the output never collides with a consumer's CSS):
 *
 *   <div|fieldset
 *        data-name="<dotted path>"
 *        data-type="<schema type>"
 *        data-widget="<resolved widget>"
 *        [data-required]
 *        [data-variant="object" | "group"]>
 *     <label|legend [for]>…</label|legend>
 *     <input|select|textarea …>                       (scalar rows)
 *     <input><label>…</label>                         (boolean rows, control-first)
 *     <label><input><span>…</span></label>            (enum-group option entries)
 *     <small id="…-hint">description</small>
 *     <!-- nested fields (object rows) -->
 *   </div|fieldset>
 *
 * - `name` stays dotted (e.g. `user.age`) so FormData round-trips through
 *   `normalizeFormData`. `id` / `for` / `aria-describedby` replace dots with
 *   dashes to stay CSS-selector-safe.
 * - Uses hono/jsx, so attribute names follow HTML standards
 *   (e.g., use "class" instead of React's "className").
 */
import type { PropsWithChildren } from "hono/jsx";
import type { JSX } from "hono/jsx/jsx-runtime";
import type { ObjectSchema, StrictObjectSchema, Meta } from "./types.ts";
import type { JSONSchema } from "zod/v4/core";

export type { ObjectSchema, Meta };

/**
 * Definition helper — returns the given meta object as-is (with its type narrowed).
 */
export function defineMeta<T extends Meta>(meta: T): T {
  return meta;
}

/**
 * Default path→id mapping: CSS-safe (dots become dashes, so `#user-name`
 * selects the element, unlike `#user.name` which would be parsed as
 * "element with id `user` and class `name`").
 */
const defaultGetID = (path: string): string => path.replace(/\./g, "-");

/**
 * Convert a JSON Schema object to a JSX string of form elements (no wrapping <form/>).
 */
export function convertSchemaToString(schema: ObjectSchema): string {
  return RenderSchemaToHonoElements({ schema }).toString();
}

/**
 * Convert a JSON Schema to a complete `<form>` string with rendered fields.
 */
export function convertSchemaToFormString(
  schema: ObjectSchema,
  props?: JSX.IntrinsicElements["form"]
): string {
  return RenderSchemaToHonoForm({
    schema,
    ...props,
  }).toString();
}

/**
 * JSX component that renders a `<form>` and the fields derived from a JSON Schema.
 */
export function RenderSchemaToHonoForm({
  schema,
  children,
  ...props
}: PropsWithChildren<
  JSX.IntrinsicElements["form"] & {
    schema: ObjectSchema;
  }
>) {
  return (
    <form {...props}>
      <RenderSchemaToHonoElements schema={schema} />
      {children}
    </form>
  );
}

/**
 * JSX fragment that renders form controls from a JSON Schema.
 *
 * @param schema JSON Schema to render. Must be `{ type: "object", properties }`.
 * @param parent Internal path prefix for nested fields.
 * @param getID  Map a field path (dotted) to an element id. Defaults to
 *               replacing dots with dashes so ids are CSS-selector-safe.
 */
export function RenderSchemaToHonoElements({
  schema: _schema,
  parent,
  getID = defaultGetID,
}: {
  schema: ObjectSchema;
  parent?: string;
  getID?: (path: string) => string;
}) {
  const schema = _schema as StrictObjectSchema;

  if (schema.type !== "object") {
    throw new Error("Root schema must be of type object");
  }
  if (!schema.properties) {
    throw new Error("Root schema must have properties");
  }
  const requiredKeys = new Set(schema.required);

  return (
    <>
      {Object.entries(schema.properties).map(([key, value]) => {
        if (typeof value === "boolean" || !value.type)
          throw new Error(
            `Unsupported schema type for field "${key}", missing type`
          );

        const {
          uiWidget,
          default: defaultValue,
          description,
        } = value as JSONSchema.JSONSchema & Meta;
        const defaultValueString =
          defaultValue == undefined ? undefined : String(defaultValue);
        const required = requiredKeys.has(key);
        const displayName = value.uiName || key;
        const name = parent ? `${parent}.${key}` : key;
        const id = getID(name);
        const hintId = description ? `${id}-hint` : undefined;
        const ariaRequired = required ? true : undefined;
        const dataRequired = required ? true : undefined;

        // Shared data-* attributes for the row wrapper.
        const rowAttrs = (widget: string) => ({
          "data-name": name,
          "data-type": value.type as string,
          "data-widget": widget,
          "data-required": dataRequired,
        });

        const Hint = description ? (
          <small id={hintId}>{description}</small>
        ) : null;

        // -------- string --------
        if (value.type === "string") {
          if (value.enum) {
            if (uiWidget === "select") {
              return (
                <div key={name} {...rowAttrs("select")}>
                  <label for={id}>{displayName}</label>
                  <select
                    id={id}
                    name={name}
                    required={required}
                    aria-required={ariaRequired}
                    aria-describedby={hintId}
                  >
                    {value.enum.map((optionValue) => (
                      <option
                        key={optionValue}
                        value={String(optionValue)}
                        selected={defaultValue === optionValue}
                      >
                        {String(optionValue)}
                      </option>
                    ))}
                  </select>
                  {Hint}
                </div>
              );
            }
            // radio group
            return (
              <fieldset
                key={name}
                data-variant="group"
                aria-required={ariaRequired}
                aria-describedby={hintId}
                {...rowAttrs("radio")}
              >
                <legend>{displayName}</legend>
                {value.enum.map((optionValue, i) => (
                  <label key={String(optionValue)}>
                    <input
                      type="radio"
                      name={name}
                      value={String(optionValue)}
                      // HTML spec: marking any one radio in a group as
                      // required makes the whole group required.
                      required={required && i === 0}
                      checked={defaultValue === optionValue}
                    />
                    <span>{String(optionValue)}</span>
                  </label>
                ))}
                {Hint}
              </fieldset>
            );
          }

          // typed string formats
          if (
            value.format === "uri" ||
            value.format === "email" ||
            value.format === "date-time-local" ||
            value.format === "time-local"
          ) {
            const type = {
              uri: "url",
              email: "email",
              "date-time-local": "datetime-local",
              "time-local": "time",
            }[value.format];
            return (
              <div key={name} {...rowAttrs(type)}>
                <label for={id}>{displayName}</label>
                <input
                  id={id}
                  name={name}
                  type={type}
                  required={required}
                  aria-required={ariaRequired}
                  aria-describedby={hintId}
                  value={defaultValueString}
                  minlength={value.minLength}
                  maxlength={value.maxLength}
                />
                {Hint}
              </div>
            );
          }

          if (uiWidget === "textarea") {
            return (
              <div key={name} {...rowAttrs("textarea")}>
                <label for={id}>{displayName}</label>
                <textarea
                  id={id}
                  name={name}
                  required={required}
                  aria-required={ariaRequired}
                  aria-describedby={hintId}
                  minlength={value.minLength}
                  maxlength={value.maxLength}
                >
                  {defaultValueString}
                </textarea>
                {Hint}
              </div>
            );
          }

          return (
            <div key={name} {...rowAttrs("text")}>
              <label for={id}>{displayName}</label>
              <input
                id={id}
                name={name}
                type="text"
                required={required}
                aria-required={ariaRequired}
                aria-describedby={hintId}
                value={defaultValueString}
                minlength={value.minLength}
                maxlength={value.maxLength}
                pattern={value.pattern}
                title={value.pattern}
              />
              {Hint}
            </div>
          );
        }

        // -------- number / integer --------
        if (value.type === "number" || value.type === "integer") {
          const step = { number: "any", integer: "1" }[value.type];
          const widget = uiWidget === "range" ? "range" : "number";
          return (
            <div key={name} {...rowAttrs(widget)}>
              <label for={id}>{displayName}</label>
              <input
                id={id}
                name={name}
                type={widget}
                required={required}
                aria-required={ariaRequired}
                aria-describedby={hintId}
                value={defaultValueString}
                min={value.minimum}
                max={value.maximum}
                step={step}
              />
              {Hint}
            </div>
          );
        }

        // -------- boolean --------
        if (value.type === "boolean") {
          return (
            <div key={name} {...rowAttrs("checkbox")}>
              <input
                id={id}
                name={name}
                type="checkbox"
                required={required}
                aria-required={ariaRequired}
                aria-describedby={hintId}
                checked={defaultValue as boolean | undefined}
              />
              <label for={id}>{displayName}</label>
              {Hint}
            </div>
          );
        }

        // -------- array (enum items only) --------
        if (value.type === "array") {
          if (typeof value.items !== "object" || Array.isArray(value.items)) {
            throw new Error(
              `Unsupported schema type for field "${name}", array items schema is invalid`
            );
          }
          if (["object", "array"].includes(value.items.type!)) {
            throw new Error(
              `Unsupported schema type for field "${name}", array of ${value.items.type} is not supported`
            );
          }
          const enumItems = value.items.enum;
          if (!enumItems) {
            throw new Error(
              `Unsupported schema type for field "${name}", array items must have enum`
            );
          }

          // Array defaults are themselves arrays; a scalar === array check
          // would always be false, so use Array.includes.
          const defaultArray = Array.isArray(defaultValue)
            ? (defaultValue as unknown[])
            : undefined;
          const isDefaultSelected = (optionValue: unknown) =>
            defaultArray !== undefined && defaultArray.includes(optionValue);

          if (uiWidget === "select") {
            return (
              <div key={name} {...rowAttrs("select")}>
                <label for={id}>{displayName}</label>
                <select
                  id={id}
                  name={name}
                  multiple
                  required={required}
                  aria-required={ariaRequired}
                  aria-describedby={hintId}
                >
                  {enumItems.map((optionValue) => (
                    <option
                      key={optionValue}
                      value={String(optionValue)}
                      selected={isDefaultSelected(optionValue)}
                    >
                      {String(optionValue)}
                    </option>
                  ))}
                </select>
                {Hint}
              </div>
            );
          }

          // checkbox group. Marking individual boxes `required` in HTML means
          // "this exact one must be checked"; rarely the intent for
          // multi-select. Mark the group aria-required only; enforcement
          // stays with app validation.
          return (
            <fieldset
              key={name}
              data-variant="group"
              aria-required={ariaRequired}
              aria-describedby={hintId}
              {...rowAttrs("checkbox")}
            >
              <legend>{displayName}</legend>
              {enumItems.map((optionValue) => (
                <label key={optionValue}>
                  <input
                    type="checkbox"
                    name={name}
                    value={String(optionValue)}
                    checked={isDefaultSelected(optionValue)}
                  />
                  <span>{String(optionValue)}</span>
                </label>
              ))}
              {Hint}
            </fieldset>
          );
        }

        // -------- nested object --------
        if (value.type === "object") {
          return (
            <fieldset
              key={name}
              data-variant="object"
              aria-describedby={hintId}
              {...rowAttrs("object")}
            >
              <legend>{displayName}</legend>
              <RenderSchemaToHonoElements
                schema={value as ObjectSchema}
                parent={name}
                getID={getID}
              />
              {Hint}
            </fieldset>
          );
        }

        throw new Error(
          `Unsupported schema type for field "${name}", got "${value.type}"`
        );
      })}
    </>
  );
}
