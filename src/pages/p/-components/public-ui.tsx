/**
 * Primitivos visuais da página pública (`/p/$token`).
 *
 * Tudo em tokens de tema (`bg-background`, `bg-card`, `text-muted-foreground`,
 * `bg-primary`…) para que a tela acompanhe o dark/light do resto do projeto —
 * nenhuma cor crua aqui. O layout segue o protótipo aprovado: topbar com marca,
 * pill de rascunho salvo, stepper numerado e um cartão por etapa com o rodapé
 * de ações dentro do próprio cartão.
 */
import { Check, Loader2, Volume2 } from 'lucide-react';
import { ThemeSwitcher } from '@/components/navbar-components/theme-switcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { FORM_STEPS } from '../-form';
import type { Option } from '../-types';

export function PublicTopbar({
  savedAt,
  saving,
}: {
  savedAt: string | null;
  saving: boolean;
}) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[880px] items-center justify-between gap-3 px-5 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] bg-primary text-primary-foreground">
            <Volume2 className="h-[18px] w-[18px]" />
          </span>
          <div className="leading-tight">
            <p className='font-semibold text-sm tracking-tight'>
              André Sonorização
            </p>
            <p className='text-muted-foreground text-xs'>
              Confirmação de proposta de evento
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <SavePill savedAt={savedAt} saving={saving} />
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}

function SavePill({
  savedAt,
  saving,
}: {
  savedAt: string | null;
  saving: boolean;
}) {
  return (
    <span className="hidden items-center gap-1.5 rounded-full border bg-muted/60 px-2.5 py-1 text-[11px] text-muted-foreground sm:inline-flex">
      {saving ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      )}
      {saving
        ? 'Salvando…'
        : savedAt
          ? `Rascunho salvo ${savedAt}`
          : 'Rascunho automático'}
    </span>
  );
}

/** Stepper numerado: concluída (check), ativa (ring) ou futura. */
export function Stepper({
  current,
  onSelect,
}: {
  current: number;
  onSelect: (step: number) => void;
}) {
  return (
    <Card className="mb-5 rounded-lg border shadow-none">
      <CardContent className="px-3 py-3.5">
        <ol className="flex items-start">
          {FORM_STEPS.map((item, index) => {
            const done = index < current;
            const active = index === current;
            return (
              <li
                className="relative flex flex-1 flex-col items-center"
                key={item.id}
              >
                {index > 0 && (
                  <span
                    aria-hidden
                    className={cn(
                      'absolute top-[14px] right-1/2 h-0.5 w-full',
                      done ? 'bg-primary' : 'bg-border'
                    )}
                  />
                )}
                <button
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'relative z-10 grid h-7 w-7 place-items-center rounded-full border-2 bg-card font-semibold text-[11px] tabular-nums transition-colors',
                    done && 'border-primary bg-primary text-primary-foreground',
                    active &&
                    'border-primary text-primary ring-4 ring-primary/15',
                    !(done || active) && 'border-border text-muted-foreground',
                    index <= current ? 'cursor-pointer' : 'cursor-default'
                  )}
                  disabled={index > current}
                  onClick={() => onSelect(index)}
                  type="button"
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </button>
                <span
                  className={cn(
                    'mt-1.5 text-[11px] leading-tight',
                    active
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {item.short}
                </span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

/** Cartão da etapa: cabeçalho com título/descrição e rodapé de ações. */
export function StepCard({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-lg shadow-sm">
      <div className='px-6 pt-5 pb-1'>
        <h2 className='font-semibold text-[18px] tracking-tight'>{title}</h2>
        {description && (
          <p className="mt-1 text-[13px] text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <CardContent className='space-y-5 px-6 pt-4 pb-6'>{children}</CardContent>
      {actions && (
        <div className="flex flex-col-reverse items-stretch justify-between gap-2.5 border-t bg-muted/50 px-6 py-4 sm:flex-row sm:items-center sm:gap-3">
          {actions}
        </div>
      )}
    </Card>
  );
}

export function StepActions({
  back,
  next,
}: {
  back?: React.ReactNode;
  next?: React.ReactNode;
}) {
  return (
    <>
      <div className="sm:w-56">{back}</div>
      <div className="sm:flex sm:justify-end">{next}</div>
    </>
  );
}

export function BackButton({
  label = 'Voltar',
  onClick,
}: {
  label?: string;
  onClick: () => void;
}) {
  return (
    <Button
      className="w-full sm:w-auto"
      onClick={onClick}
      size="lg"
      variant="ghost"
    >
      {label}
    </Button>
  );
}

export function ContinueButton({
  label,
  loading,
  onClick,
  disabled,
}: {
  label: string;
  loading?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      className="w-full sm:w-auto"
      disabled={loading || disabled}
      onClick={onClick}
      size="lg"
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  optional,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label
        className={cn(
          'flex items-center gap-1 font-medium text-[13px]',
          error && 'text-destructive'
        )}
        htmlFor={htmlFor}
      >
        {label}
        {required && <span className="text-destructive">*</span>}
        {optional && (
          <span className="font-normal text-muted-foreground">(opcional)</span>
        )}
      </Label>
      {children}
      {hint && !error && (
        <p className='text-muted-foreground text-xs leading-relaxed'>{hint}</p>
      )}
    </div>
  );
}

export function FieldError({
  show,
  message = 'Confira este campo.',
}: {
  show: boolean;
  message?: string;
}) {
  return show ? (
    <p className='font-medium text-destructive text-xs'>{message}</p>
  ) : null;
}

export function hasError(errors: string[], path: string): boolean {
  return errors.includes(path);
}

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  invalid,
  inputMode,
  maxLength,
  tabIndex,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  maxLength?: number;
  tabIndex?: number;
}) {
  return (
    <Input
      className={cn(
        invalid && 'border-destructive focus-visible:ring-destructive/30'
      )}
      id={id}
      inputMode={inputMode}
      maxLength={maxLength}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      tabIndex={tabIndex}
      value={value}
    />
  );
}

export function AreaInput({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <Textarea
      className="min-h-0 resize-y"
      id={id}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      value={value}
    />
  );
}

/** Grupo segmentado em cards (PF/PJ, internet sim/não/não sei). */
export function RadioCards({
  value,
  options,
  onChange,
  columns = 2,
  namePrefix,
}: {
  value: string;
  options: readonly { id: string; label: string; hint?: string }[];
  onChange: (v: string) => void;
  columns?: 1 | 2 | 3;
  namePrefix: string;
}) {
  return (
    <RadioGroup
      className={cn(
        'grid gap-2',
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-3'
      )}
      onValueChange={onChange}
      value={value}
    >
      {options.map((option) => {
        const id = `${namePrefix}-${option.id}`;
        const selected = value === option.id;
        return (
          <Label
            className={cn(
              'flex cursor-pointer items-start gap-2.5 rounded-md border p-3 text-sm transition-colors',
              selected
                ? 'border-primary bg-primary/5'
                : 'hover:border-muted-foreground/30 hover:bg-muted/40'
            )}
            htmlFor={id}
            key={option.id}
          >
            <RadioGroupItem className="mt-0.5" id={id} value={option.id} />
            <span className="flex flex-col gap-0.5">
              <span
                className={cn('font-medium', selected && 'text-foreground')}
              >
                {option.label}
              </span>
              {option.hint && (
                <span className='font-normal text-muted-foreground text-xs leading-relaxed'>
                  {option.hint}
                </span>
              )}
            </span>
          </Label>
        );
      })}
    </RadioGroup>
  );
}

/** Caixa marcável em grid, usada para acessos, estilos e extras. */
export function CheckCard({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (c: boolean) => void;
}) {
  return (
    <Label
      className={cn(
        'flex cursor-pointer items-start gap-2.5 rounded-md border p-3 text-sm transition-colors',
        checked
          ? 'border-primary bg-primary/5'
          : 'hover:border-muted-foreground/30 hover:bg-muted/40'
      )}
    >
      <Checkbox
        checked={checked}
        className="mt-0.5"
        onCheckedChange={(value) => onChange(value === true)}
      />
      <span className="flex flex-col gap-0.5">
        <span className="font-medium">{label}</span>
        {hint && (
          <span className='font-normal text-muted-foreground text-xs leading-relaxed'>
            {hint}
          </span>
        )}
      </span>
    </Label>
  );
}

export function CheckGrid({
  options,
  selected,
  onToggle,
  invalid,
}: {
  options: Option[];
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
  invalid?: boolean;
}) {
  return (
    <div
      className={cn(
        'grid gap-2 sm:grid-cols-2',
        invalid && 'rounded-lg ring-1 ring-destructive/40'
      )}
    >
      {options.map((option) => (
        <CheckCard
          checked={selected.includes(option.id)}
          hint={option.hint}
          key={option.id}
          label={option.label}
          onChange={(checked) => onToggle(option.id, checked)}
        />
      ))}
    </div>
  );
}

export function SelectInput({
  id,
  value,
  options,
  onChange,
  placeholder,
}: {
  id?: string;
  value: string;
  options?: Option[];
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <select
      className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      id={id}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      <option value="">{placeholder}</option>
      {(options ?? []).map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function TimeInput({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  return (
    <Input
      className={cn(
        'tabular-nums',
        invalid && 'border-destructive focus-visible:ring-destructive/30'
      )}
      id={id}
      onChange={(event) => onChange(event.target.value)}
      type="time"
      value={value}
    />
  );
}

/** Linha do `.tl` do protótipo: ícone + rótulo/descrição + horário à direita. */
export function TimelineRow({
  icon,
  title,
  span,
  htmlFor,
  value,
  onChange,
  invalid,
  trailing,
}: {
  icon: React.ReactNode;
  title: string;
  span?: string;
  htmlFor: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <Label
          className={cn(
            'cursor-pointer font-medium text-sm',
            invalid && 'text-destructive'
          )}
          htmlFor={htmlFor}
        >
          {title}
        </Label>
        {span && (
          <p className='text-muted-foreground text-xs leading-relaxed'>
            {span}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <TimeInput
          id={htmlFor}
          invalid={invalid}
          onChange={onChange}
          value={value}
        />
        {trailing}
      </div>
    </div>
  );
}

export function Callout({
  icon,
  children,
  tone = 'muted',
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  tone?: 'muted' | 'primary';
}) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border p-4 text-sm leading-relaxed',
        tone === 'primary'
          ? 'border-primary/30 bg-primary/5'
          : 'bg-muted/40 text-muted-foreground'
      )}
    >
      {icon && <span className="mt-0.5 shrink-0 text-primary">{icon}</span>}
      <div className="space-y-1 text-foreground/90">{children}</div>
    </div>
  );
}

/** Bloco `.total` do protótipo: só o valor acordado, em destaque. */
export function ValueBlock({
  label,
  value,
  caption,
  lines,
}: {
  label: string;
  value: string;
  caption?: string;
  lines?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-primary p-5 text-primary-foreground">
      <p className='font-medium text-[11px] uppercase tracking-wider opacity-80'>
        {label}
      </p>
      <p className='mt-1 font-semibold text-[32px] tabular-nums leading-none tracking-tight'>
        {value}
      </p>
      {caption && <p className="mt-2 text-sm opacity-80">{caption}</p>}
      {lines && (
        <div className='mt-4 space-y-1 border-primary-foreground/25 border-t pt-3 text-xs opacity-80'>
          {lines}
        </div>
      )}
    </div>
  );
}

/** Lista `.plist` do protótipo: itens da proposta sem preço unitário. */
export function OfferList({
  section,
  items,
}: {
  section: string;
  items: { name: string; detail: string | null }[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <p className='bg-muted px-4 py-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider'>
        {section}
      </p>
      {items.map((item) => (
        <div
          className="flex items-start justify-between gap-4 border-t px-4 py-2.5 text-sm first:border-t-0"
          key={item.name}
        >
          <div className="min-w-0">
            <p className="font-medium">{item.name}</p>
            {item.detail && (
              <p className='text-muted-foreground text-xs leading-relaxed'>
                {item.detail}
              </p>
            )}
          </div>
          <p className='shrink-0 text-muted-foreground text-xs'>incluso</p>
        </div>
      ))}
    </div>
  );
}

export function ReviewBlock({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between gap-3 bg-muted px-4 py-2.5">
        <h3 className='font-semibold text-sm'>{title}</h3>
        <Button onClick={onEdit} size="sm" variant="ghost">
          Editar
        </Button>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function ReviewLine({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 border-t px-4 py-2.5 text-sm first:border-t-0 sm:grid-cols-[190px_1fr] sm:gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words font-medium">{value || '—'}</span>
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className='font-semibold text-[11px] text-muted-foreground uppercase tracking-wider'>
      {children}
    </p>
  );
}

export function Grid2({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2', className)}>{children}</div>
  );
}
