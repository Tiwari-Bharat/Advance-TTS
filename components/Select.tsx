import React from "react";
import { VoiceOption } from "../types";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
	label: string;
	options: VoiceOption[];
}

const Select: React.FC<SelectProps> = ({ label, options, ...props }) => {
	return (
		<div>
			<label
				htmlFor={props.id || "select"}
				className='block text-sm font-medium text-slate-300 mb-2'>
				{label}
			</label>
			<select
				id={props.id || "select"}
				className={`w-full p-2.5 bg-slate-800 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition appearance-none ${
					props.disabled ? "opacity-50 cursor-not-allowed" : ""
				}`}
				style={{
					backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
					backgroundPosition: "right 0.5rem center",
					backgroundRepeat: "no-repeat",
					backgroundSize: "1.5em 1.5em",
					paddingRight: "2.5rem",
				}}
				{...props}>
				{options.map(option => (
					<option key={option.value} value={option.value} title={option.description}>
						{option.label}
					</option>
				))}
			</select>
		</div>
	);
};

export default Select;
