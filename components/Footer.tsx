import React from "react";

const Footer: React.FC = () => {
	const currentYear = new Date().getFullYear();

	return (
		<footer className='bg-slate-900 border-t border-slate-700'>
			<div className='max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8'>
				<div className='flex flex-col sm:flex-row justify-between items-center text-center text-slate-400 text-sm'>
					<p>
						&copy; {currentYear} Developed by{" "}
						<a
							href='https://my-inf.netlify.app/'
							target='_blank'
							rel='noopener noreferrer'
							className='font-semibold text-sky-400 hover:text-sky-300 transition-colors'>
							Bharat Tiwari
						</a>
					</p>
					<p className='mt-2 sm:mt-0'>
						Powered by{" "}
						<a
							href='https://my-inf.netlify.app/'
							target='_blank'
							rel='noopener noreferrer'
							className='font-semibold text-sky-400 hover:text-sky-300 transition-colors'>
							Hati Po
						</a>
					</p>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
