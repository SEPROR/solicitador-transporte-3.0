import { forwardRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import styles from './index.module.css';
import { toISODate, toTime, parseDate, parseTime } from './helpers';

registerLocale('pt-BR', ptBR);

const maskDate = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return d;
};

const maskTime = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  if (d.length > 2) return `${d.slice(0, 2)}:${d.slice(2)}`;
  return d;
};

// Input customizado: aplica a máscara antes de o DatePicker interpretar o valor
const createMaskedInput = (mask, maxLength) =>
  forwardRef(function MaskedInput({ onChange, ...props }, ref) {
    return (
      <input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        maxLength={maxLength}
        onChange={(e) => {
          e.target.value = mask(e.target.value);
          onChange?.(e);
        }}
      />
    );
  });

const DateMaskedInput = createMaskedInput(maskDate, 10);
const TimeMaskedInput = createMaskedInput(maskTime, 5);

const sharedProps = {
  className: styles.input,
  wrapperClassName: styles.pickerWrapper,
  popperClassName: styles.popper,
  calendarClassName: styles.calendar,
  autoComplete: 'off',
  strictParsing: true
};

export function DateField({ name, value, onChange, minDate, required, placeholder = 'dd/mm/aaaa' }) {
  return (
    <DatePicker
      {...sharedProps}
      customInput={<DateMaskedInput />}
      selected={parseDate(value)}
      onChange={(d) => onChange({ target: { name, value: toISODate(d) } })}
      locale="pt-BR"
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholder}
      minDate={minDate}
      required={required}
    />
  );
}

export function TimeField({ name, value, onChange, required, intervals = 15, placeholder = '--:--' }) {
  return (
    <DatePicker
      {...sharedProps}
      customInput={<TimeMaskedInput />}
      selected={parseTime(value)}
      onChange={(d) => onChange({ target: { name, value: toTime(d) } })}
      showTimeSelect
      showTimeSelectOnly
      timeIntervals={intervals}
      timeCaption="Horário"
      dateFormat="HH:mm"
      timeFormat="HH:mm"
      placeholderText={placeholder}
      required={required}
    />
  );
}