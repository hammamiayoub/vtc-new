import React from 'react';
import { Globe, Phone } from 'lucide-react';
import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { SIGNUP_COUNTRIES, getPhonePlaceholder, type SignupCountryCode } from '../../utils/signupCountries';
import { normalizePhone } from '../../utils/validation';

interface SignupCountryPhoneFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: FieldErrors<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch: UseFormWatch<any>;
  countryFieldName?: string;
  phoneFieldName?: string;
  focusRingClass?: string;
}

export const SignupCountryPhoneFields: React.FC<SignupCountryPhoneFieldsProps> = ({
  register,
  errors,
  setValue,
  watch,
  countryFieldName = 'country',
  phoneFieldName = 'phone',
  focusRingClass = 'focus:ring-2 focus:ring-purple-500',
}) => {
  const selectedCountry = (watch(countryFieldName) as SignupCountryCode | undefined) ?? 'TN';

  return (
    <>
      <div>
        <label htmlFor={countryFieldName} className="block text-sm font-medium text-gray-700 mb-1">
          Pays
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Globe className="h-5 w-5 text-gray-400" />
          </div>
          <select
            id={countryFieldName}
            {...register(countryFieldName)}
            className={`block w-full pl-10 pr-3 py-3 border rounded-lg bg-white focus:outline-none ${focusRingClass} transition-all ${
              errors[countryFieldName] ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            {SIGNUP_COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.label} ({country.dialCode})
              </option>
            ))}
          </select>
        </div>
        {errors[countryFieldName] && (
          <p className="mt-2 text-sm text-red-600">{String(errors[countryFieldName]?.message)}</p>
        )}
      </div>

      <div>
        <label htmlFor={phoneFieldName} className="block text-sm font-medium text-gray-700 mb-1">
          Téléphone
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Phone className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id={phoneFieldName}
            {...register(phoneFieldName)}
            type="tel"
            placeholder={getPhonePlaceholder(selectedCountry)}
            autoComplete="tel"
            onBlur={(e) => {
              const normalized = normalizePhone(e.target.value, selectedCountry);
              if (normalized !== e.target.value) {
                setValue(phoneFieldName, normalized, { shouldValidate: true });
              }
            }}
            className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none ${focusRingClass} transition-all ${
              errors[phoneFieldName] ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        </div>
        {errors[phoneFieldName] && (
          <p className="mt-2 text-sm text-red-600">{String(errors[phoneFieldName]?.message)}</p>
        )}
      </div>
    </>
  );
};
