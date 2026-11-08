import React from "react";
import clsx from "clsx";

// Dugme Montaže u izgledu Security dela (sx-btn: pilula sa "kupolom"). API je isti kao ranije:
// type = izgled (primary, secondary, tertiary, error, warning), size, prefix/suffix, loading, svgOnly, fullWidth.
// HTML type ostaje "submit" kao ranije (dugme u formi šalje formu).
const types = {
  primary: "sx-btn--primary",
  secondary: "",
  tertiary: "sx-btn--ghost",
  error: "sx-btn--danger",
  warning: "mx-btn--warn"
};
const sizes = { tiny: "sx-btn--sm mx-btn--xs", small: "sx-btn--sm", medium: "", large: "sx-btn--lg" };
const shapes = { square: "", circle: "mx-btn--circle", rounded: "" };

export interface ButtonProps {
  size?: keyof typeof sizes;
  type?: keyof typeof types;
  variant?: "styled" | "unstyled";
  shape?: keyof typeof shapes;
  svgOnly?: boolean;
  children?: React.ReactNode;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  shadow?: boolean;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  ref?: React.Ref<HTMLButtonElement>;
  className?: string;
}

export const Button = ({
  size = "medium",
  type = "primary",
  variant = "styled",
  shape = "square",
  svgOnly = false,
  children,
  prefix,
  suffix,
  shadow: _shadow = false,
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  ref,
  className,
  asChild: _asChild,
  ...rest
}: ButtonProps & { asChild?: boolean }) => {
  return (
    <button
      ref={ref}
      type="submit"
      disabled={disabled}
      onClick={onClick}
      tabIndex={0}
      aria-busy={loading || undefined}
      className={clsx(
        variant === "unstyled" ? "mx-btn--plain" : clsx("sx-btn sx-fill", types[type], sizes[size], shapes[shape], svgOnly && "sx-btn--icon"),
        loading && "is-busy",
        fullWidth && "mx-btn--full",
        className
      )}
      {...rest}
    >
      {prefix}
      {children !== undefined && children !== null && children !== false && <span className="mx-btn__label">{children}</span>}
      {suffix}
    </button>
  );
};
