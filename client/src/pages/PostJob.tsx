import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

interface JobFormData {
    // Step 1: Opportunity details
    type: 'Full Time' | 'Internship' | 'Contractual / Freelance work' | 'Volunteer';
    title: string;
    location: string;
    industry: string;
    workplaceType: 'On-site / Work from office' | 'Remote / Work from home' | 'Hybrid';
    salaryCurrency: string;
    salaryType: string;
    salaryMin: string;
    salaryMax: string;
    description: string;
    
    // Step 2: Application requirements
    skills: string;
    workExperience: 'Experience required' | 'Fresher required';
    minYears: string;
    maxYears: string;
    receiveCandidatesVia: 'This Portal' | 'An external medium';
    deadline: string;
    
    // Step 3: Company details
    company: string;
    companyDescription: string;
}

const PostJob = () => {
    const navigate = useNavigate();
    const { show: showToast } = useToast();
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);

    // Block non-alumni/non-admin from accessing this page
    useEffect(() => {
        if (user && user.role !== 'alumni' && user.role !== 'admin') {
            showToast('Only graduated alumni and admins can create job postings.', 'error');
            navigate('/jobs');
        }
    }, [user]);

    const [jobImage, setJobImage] = useState<File | null>(null);

    const [formData, setFormData] = useState<JobFormData>({
        type: 'Full Time',
        title: '',
        location: '',
        industry: '',
        workplaceType: 'On-site / Work from office',
        salaryCurrency: 'INR',
        salaryType: '',
        salaryMin: '',
        salaryMax: '',
        description: '',
        skills: '',
        workExperience: 'Experience required',
        minYears: '',
        maxYears: '',
        receiveCandidatesVia: 'This Portal',
        deadline: '',
        company: '',
        companyDescription: ''
    });

    const updateField = (field: keyof JobFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNext = () => {
        // Validate current step
        if (currentStep === 1) {
            if (!formData.title.trim() || !formData.location.trim() || !formData.description.trim()) {
                showToast('Please fill all required fields', 'error');
                return;
            }
        } else if (currentStep === 2) {
            if (!formData.deadline) {
                showToast('Please select a deadline', 'error');
                return;
            }
        }
        
        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        } else {
            navigate('/jobs');
        }
    };

    const handleSubmit = async () => {
        if (!formData.company.trim() || !formData.companyDescription.trim()) {
            showToast('Please fill all required fields', 'error');
            return;
        }

        try {
            // Upload image first if selected
            let imageUrl: string | undefined = undefined;
            if (jobImage) {
                const fd = new FormData();
                fd.append('image', jobImage);
                const up = await api.post('/upload/job-image', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                imageUrl = up.data.relative || up.data.url;
            }

            // Map frontend fields to backend schema
            const jobData = {
                title: formData.title,
                company: formData.company,
                location: formData.location,
                type: formData.type === 'Full Time' ? 'Full-time' : 
                      formData.type === 'Internship' ? 'Internship' : 
                      formData.type === 'Contractual / Freelance work' ? 'Contract' : 'Full-time',
                mode: formData.workplaceType === 'Remote / Work from home' ? 'Remote' : 
                      formData.workplaceType === 'Hybrid' ? 'Hybrid' : 'On-site',
                salary: formData.salaryMin && formData.salaryMax 
                    ? `${formData.salaryCurrency} ${formData.salaryMin}-${formData.salaryMax} ${formData.salaryType}`
                    : undefined,
                description: formData.description,
                requirements: formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
                image: imageUrl,
                industry: formData.industry,
                workExperience: formData.workExperience,
                experienceRange: formData.minYears && formData.maxYears ? `${formData.minYears}-${formData.maxYears} years` : undefined,
                deadline: formData.deadline,
                companyDescription: formData.companyDescription
            };

            await api.post('/jobs', jobData);
            showToast('Job submitted for admin approval. It will be visible once approved.', 'success');
            navigate('/jobs');
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to post job', 'error');
        }
    };

    const steps = [
        { number: 1, label: 'Opportunity details' },
        { number: 2, label: 'Application requirements' },
        { number: 3, label: 'Company details' }
    ];

    return (
        <div className="min-h-screen bg-transparent py-8">
            <div className="max-w-3xl mx-auto px-4">
                {/* Header */}
                <div className="bg-[var(--text-secondary)] text-[var(--bg-primary)] px-4 sm:px-6 py-3 sm:py-4 mb-4 sm:mb-6">
                    <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-lg">MIC COLLEGE ALUMINI JOB POST PAGE</span>
                    </div>
                </div>

                {/* Steps indicator */}
                <div className="bg-[var(--bg-secondary)] shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
                    <div className="flex items-center justify-between mb-4">
                        {steps.map((step, idx) => (
                            <div key={step.number} className="flex items-center flex-1">
                                <div className="flex items-center gap-1 sm:gap-3">
                                    <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center text-sm font-medium ${
                                        currentStep > step.number 
                                            ? 'bg-[var(--text-secondary)] text-[var(--bg-primary)]' 
                                            : currentStep === step.number
                                            ? 'bg-[var(--border-color)] text-[var(--text-primary)] border-2 border-[var(--border-color)]'
                                            : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                                    }`}>
                                        {currentStep > step.number ? <Check size={16} /> : step.number}
                                    </div>
                                    <span className={`text-xs sm:text-sm font-medium hidden sm:inline ${
                                        currentStep === step.number 
                                            ? 'text-[var(--text-primary)]' 
                                            : 'text-[var(--text-secondary)]'
                                    }`}>
                                        {step.label}
                                    </span>
                                </div>
                                {idx < steps.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-2 sm:mx-4 ${
                                        currentStep > step.number ? 'bg-[var(--text-secondary)]' : 'bg-[var(--border-color)]'
                                    }`} />
                                )}
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">Fields marked * are mandatory</p>
                </div>

                {/* Form Content */}
                <div className="bg-[var(--bg-secondary)] shadow-sm p-6">
                    {/* Step 1: Opportunity details */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    Opportunity type*
                                </label>
                                <div className="space-y-2">
                                    {['Full Time', 'Internship', 'Contractual / Freelance work', 'Volunteer'].map(type => (
                                        <label key={type} className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="type"
                                                value={type}
                                                checked={formData.type === type}
                                                onChange={(e) => updateField('type', e.target.value as any)}
                                                className="text-[var(--accent)]"
                                            />
                                            <span className="text-sm text-[var(--text-primary)]">{type}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    Opportunity title*
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => updateField('title', e.target.value)}
                                    placeholder="Enter title"
                                    className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                                />
                                {!formData.title && <p className="text-xs text-[var(--text-secondary)] mt-1">This information is required</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    Location(s)*
                                </label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => updateField('location', e.target.value)}
                                    placeholder="Enter location(s)"
                                    className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                                />
                                {!formData.location && <p className="text-xs text-[var(--text-secondary)] mt-1">This information is required</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    Industry
                                </label>
                                <input
                                    type="text"
                                    value={formData.industry}
                                    onChange={(e) => updateField('industry', e.target.value)}
                                    placeholder="Enter industry"
                                    className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    Workplace type*
                                </label>
                                <div className="space-y-2">
                                    {['On-site / Work from office', 'Remote / Work from home', 'Hybrid'].map(type => (
                                        <label key={type} className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="workplaceType"
                                                value={type}
                                                checked={formData.workplaceType === type}
                                                onChange={(e) => updateField('workplaceType', e.target.value as any)}
                                                className="text-[var(--accent)]"
                                            />
                                            <span className="text-sm text-[var(--text-primary)]">{type}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    Salary
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Currency</label>
                                        <select
                                            value={formData.salaryCurrency}
                                            onChange={(e) => updateField('salaryCurrency', e.target.value)}
                                            className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm"
                                        >
                                            <option value="AED">AED - UAE Dirham</option>
                                            <option value="AFN">AFN - Afghan Afghani</option>
                                            <option value="ALL">ALL - Albanian Lek</option>
                                            <option value="AMD">AMD - Armenian Dram</option>
                                            <option value="ANG">ANG - Netherlands Antillean Guilder</option>
                                            <option value="AOA">AOA - Angolan Kwanza</option>
                                            <option value="ARS">ARS - Argentine Peso</option>
                                            <option value="AUD">AUD - Australian Dollar</option>
                                            <option value="AWG">AWG - Aruban Florin</option>
                                            <option value="AZN">AZN - Azerbaijani Manat</option>
                                            <option value="BAM">BAM - Bosnia-Herzegovina Convertible Mark</option>
                                            <option value="BBD">BBD - Barbadian Dollar</option>
                                            <option value="BDT">BDT - Bangladeshi Taka</option>
                                            <option value="BGN">BGN - Bulgarian Lev</option>
                                            <option value="BHD">BHD - Bahraini Dinar</option>
                                            <option value="BIF">BIF - Burundian Franc</option>
                                            <option value="BMD">BMD - Bermudan Dollar</option>
                                            <option value="BND">BND - Brunei Dollar</option>
                                            <option value="BOB">BOB - Bolivian Boliviano</option>
                                            <option value="BRL">BRL - Brazilian Real</option>
                                            <option value="BSD">BSD - Bahamian Dollar</option>
                                            <option value="BTN">BTN - Bhutanese Ngultrum</option>
                                            <option value="BWP">BWP - Botswanan Pula</option>
                                            <option value="BYN">BYN - Belarusian Ruble</option>
                                            <option value="BZD">BZD - Belize Dollar</option>
                                            <option value="CAD">CAD - Canadian Dollar</option>
                                            <option value="CDF">CDF - Congolese Franc</option>
                                            <option value="CHF">CHF - Swiss Franc</option>
                                            <option value="CLP">CLP - Chilean Peso</option>
                                            <option value="CNY">CNY - Chinese Yuan</option>
                                            <option value="COP">COP - Colombian Peso</option>
                                            <option value="CRC">CRC - Costa Rican Colón</option>
                                            <option value="CUP">CUP - Cuban Peso</option>
                                            <option value="CVE">CVE - Cape Verdean Escudo</option>
                                            <option value="CZK">CZK - Czech Republic Koruna</option>
                                            <option value="DJF">DJF - Djiboutian Franc</option>
                                            <option value="DKK">DKK - Danish Krone</option>
                                            <option value="DOP">DOP - Dominican Peso</option>
                                            <option value="DZD">DZD - Algerian Dinar</option>
                                            <option value="EGP">EGP - Egyptian Pound</option>
                                            <option value="ERN">ERN - Eritrean Nakfa</option>
                                            <option value="ETB">ETB - Ethiopian Birr</option>
                                            <option value="EUR">EUR - Euro</option>
                                            <option value="FJD">FJD - Fijian Dollar</option>
                                            <option value="FKP">FKP - Falkland Islands Pound</option>
                                            <option value="FOK">FOK - Faroese Króna</option>
                                            <option value="GBP">GBP - British Pound Sterling</option>
                                            <option value="GEL">GEL - Georgian Lari</option>
                                            <option value="GGP">GGP - Guernsey Pound</option>
                                            <option value="GHS">GHS - Ghanaian Cedi</option>
                                            <option value="GIP">GIP - Gibraltar Pound</option>
                                            <option value="GMD">GMD - Gambian Dalasi</option>
                                            <option value="GNF">GNF - Guinean Franc</option>
                                            <option value="GTQ">GTQ - Guatemalan Quetzal</option>
                                            <option value="GYD">GYD - Guyanaese Dollar</option>
                                            <option value="HKD">HKD - Hong Kong Dollar</option>
                                            <option value="HNL">HNL - Honduran Lempira</option>
                                            <option value="HRK">HRK - Croatian Kuna</option>
                                            <option value="HTG">HTG - Haitian Gourde</option>
                                            <option value="HUF">HUF - Hungarian Forint</option>
                                            <option value="IDR">IDR - Indonesian Rupiah</option>
                                            <option value="ILS">ILS - Israeli New Sheqel</option>
                                            <option value="IMP">IMP - Manx pound</option>
                                            <option value="INR">INR - Indian Rupee</option>
                                            <option value="IQD">IQD - Iraqi Dinar</option>
                                            <option value="IRR">IRR - Iranian Rial</option>
                                            <option value="ISK">ISK - Icelandic Króna</option>
                                            <option value="JEP">JEP - Jersey Pound</option>
                                            <option value="JMD">JMD - Jamaican Dollar</option>
                                            <option value="JOD">JOD - Jordanian Dinar</option>
                                            <option value="JPY">JPY - Japanese Yen</option>
                                            <option value="KES">KES - Kenyan Shilling</option>
                                            <option value="KGS">KGS - Kyrgystani Som</option>
                                            <option value="KHR">KHR - Cambodian Riel</option>
                                            <option value="KID">KID - Kiribati Dollar</option>
                                            <option value="KMF">KMF - Comorian Franc</option>
                                            <option value="KRW">KRW - South Korean Won</option>
                                            <option value="KWD">KWD - Kuwaiti Dinar</option>
                                            <option value="KYD">KYD - Cayman Islands Dollar</option>
                                            <option value="KZT">KZT - Kazakhstani Tenge</option>
                                            <option value="LAK">LAK - Laotian Kip</option>
                                            <option value="LBP">LBP - Lebanese Pound</option>
                                            <option value="LKR">LKR - Sri Lankan Rupee</option>
                                            <option value="LRD">LRD - Liberian Dollar</option>
                                            <option value="LSL">LSL - Lesotho Loti</option>
                                            <option value="LYD">LYD - Libyan Dinar</option>
                                            <option value="MAD">MAD - Moroccan Dirham</option>
                                            <option value="MDL">MDL - Moldovan Leu</option>
                                            <option value="MGA">MGA - Malagasy Ariary</option>
                                            <option value="MKD">MKD - Macedonian Denar</option>
                                            <option value="MMK">MMK - Myanma Kyat</option>
                                            <option value="MNT">MNT - Mongolian Tugrik</option>
                                            <option value="MOP">MOP - Macanese Pataca</option>
                                            <option value="MRU">MRU - Mauritanian Ouguiya</option>
                                            <option value="MUR">MUR - Mauritian Rupee</option>
                                            <option value="MVR">MVR - Maldivian Rufiyaa</option>
                                            <option value="MWK">MWK - Malawian Kwacha</option>
                                            <option value="MXN">MXN - Mexican Peso</option>
                                            <option value="MYR">MYR - Malaysian Ringgit</option>
                                            <option value="MZN">MZN - Mozambican Metical</option>
                                            <option value="NAD">NAD - Namibian Dollar</option>
                                            <option value="NGN">NGN - Nigerian Naira</option>
                                            <option value="NIO">NIO - Nicaraguan Córdoba</option>
                                            <option value="NOK">NOK - Norwegian Krone</option>
                                            <option value="NPR">NPR - Nepalese Rupee</option>
                                            <option value="NZD">NZD - New Zealand Dollar</option>
                                            <option value="OMR">OMR - Omani Rial</option>
                                            <option value="PAB">PAB - Panamanian Balboa</option>
                                            <option value="PEN">PEN - Peruvian Nuevo Sol</option>
                                            <option value="PGK">PGK - Papua New Guinean Kina</option>
                                            <option value="PHP">PHP - Philippine Peso</option>
                                            <option value="PKR">PKR - Pakistani Rupee</option>
                                            <option value="PLN">PLN - Polish Zloty</option>
                                            <option value="PYG">PYG - Paraguayan Guarani</option>
                                            <option value="QAR">QAR - Qatari Rial</option>
                                            <option value="RON">RON - Romanian Leu</option>
                                            <option value="RSD">RSD - Serbian Dinar</option>
                                            <option value="RUB">RUB - Russian Ruble</option>
                                            <option value="RWF">RWF - Rwandan Franc</option>
                                            <option value="SAR">SAR - Saudi Riyal</option>
                                            <option value="SBD">SBD - Solomon Islands Dollar</option>
                                            <option value="SCR">SCR - Seychellois Rupee</option>
                                            <option value="SDG">SDG - Sudanese Pound</option>
                                            <option value="SEK">SEK - Swedish Krona</option>
                                            <option value="SGD">SGD - Singapore Dollar</option>
                                            <option value="SHP">SHP - Saint Helena Pound</option>
                                            <option value="SLE">SLE - Sierra Leonean Leone</option>
                                            <option value="SOS">SOS - Somali Shilling</option>
                                            <option value="SRD">SRD - Surinamese Dollar</option>
                                            <option value="SSP">SSP - South Sudanese Pound</option>
                                            <option value="STN">STN - São Tomé and Príncipe Dobra</option>
                                            <option value="SYP">SYP - Syrian Pound</option>
                                            <option value="SZL">SZL - Swazi Lilangeni</option>
                                            <option value="THB">THB - Thai Baht</option>
                                            <option value="TJS">TJS - Tajikistani Somoni</option>
                                            <option value="TMT">TMT - Turkmenistani Manat</option>
                                            <option value="TND">TND - Tunisian Dinar</option>
                                            <option value="TOP">TOP - Tongan Paʻanga</option>
                                            <option value="TRY">TRY - Turkish Lira</option>
                                            <option value="TTD">TTD - Trinidad and Tobago Dollar</option>
                                            <option value="TVD">TVD - Tuvaluan Dollar</option>
                                            <option value="TWD">TWD - New Taiwan Dollar</option>
                                            <option value="TZS">TZS - Tanzanian Shilling</option>
                                            <option value="UAH">UAH - Ukrainian Hryvnia</option>
                                            <option value="UGX">UGX - Ugandan Shilling</option>
                                            <option value="USD">USD - United States Dollar</option>
                                            <option value="UYU">UYU - Uruguayan Peso</option>
                                            <option value="UZS">UZS - Uzbekistan Som</option>
                                            <option value="VES">VES - Venezuelan Bolívar</option>
                                            <option value="VND">VND - Vietnamese Dong</option>
                                            <option value="VUV">VUV - Vanuatu Vatu</option>
                                            <option value="WST">WST - Samoan Tala</option>
                                            <option value="XAF">XAF - CFA Franc BEAC</option>
                                            <option value="XCD">XCD - East Caribbean Dollar</option>
                                            <option value="XDR">XDR - Special Drawing Rights</option>
                                            <option value="XOF">XOF - CFA Franc BCEAO</option>
                                            <option value="XPF">XPF - CFP Franc</option>
                                            <option value="YER">YER - Yemeni Rial</option>
                                            <option value="ZAR">ZAR - South African Rand</option>
                                            <option value="ZMW">ZMW - Zambian Kwacha</option>
                                            <option value="ZWL">ZWL - Zimbabwean Dollar</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Type</label>
                                        <select
                                            value={formData.salaryType}
                                            onChange={(e) => updateField('salaryType', e.target.value)}
                                            className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm"
                                        >
                                            <option value="">Select</option>
                                            <option value="per year">per year</option>
                                            <option value="per month">per month</option>
                                            <option value="per day">per day</option>
                                            <option value="per hour">per hour</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                    <input
                                        type="text"
                                        value={formData.salaryMin}
                                        onChange={(e) => updateField('salaryMin', e.target.value)}
                                        placeholder="Min salary"
                                        className="px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                                    />
                                    <input
                                        type="text"
                                        value={formData.salaryMax}
                                        onChange={(e) => updateField('salaryMax', e.target.value)}
                                        placeholder="Max salary"
                                        className="px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    Opportunity description*
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => updateField('description', e.target.value)}
                                    rows={6}
                                    className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                                />
                                {!formData.description && <p className="text-xs text-[var(--text-secondary)] mt-1">This information is required</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    Job Image (optional)
                                </label>
                                <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-[var(--border-color)] rounded-lg cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--bg-tertiary)] transition-colors">
                                    <div className="flex flex-col items-center gap-2">
                                        {jobImage ? (
                                            <img src={URL.createObjectURL(jobImage)} alt="preview" className="h-24 max-w-full object-contain rounded" />
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                <span className="text-sm text-[var(--text-muted)]">Click to upload image</span>
                                            </>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setJobImage(e.target.files?.[0] || null)}
                                        className="hidden"
                                    />
                                </label>
                                {jobImage && (
                                    <button type="button" onClick={() => setJobImage(null)} className="mt-2 text-xs text-red-500 hover:underline">Remove image</button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Application requirements */}
                    {currentStep === 2 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    Skills
                                </label>
                                <input
                                    type="text"
                                    value={formData.skills}
                                    onChange={(e) => updateField('skills', e.target.value)}
                                    placeholder="Enter skills (comma-separated)"
                                    className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    Work experience*
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="workExperience"
                                            value="Experience required"
                                            checked={formData.workExperience === 'Experience required'}
                                            onChange={(e) => updateField('workExperience', e.target.value as any)}
                                            className="text-[var(--accent)]"
                                        />
                                        <span className="text-sm text-[var(--text-primary)]">Experience required</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="workExperience"
                                            value="Fresher required"
                                            checked={formData.workExperience === 'Fresher required'}
                                            onChange={(e) => updateField('workExperience', e.target.value as any)}
                                            className="text-[var(--accent)]"
                                        />
                                        <span className="text-sm text-[var(--text-primary)]">Fresher required</span>
                                    </label>
                                </div>

                                {formData.workExperience === 'Experience required' && (
                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-[var(--text-secondary)] mb-1">Min years*</label>
                                            <select
                                                value={formData.minYears}
                                                onChange={(e) => updateField('minYears', e.target.value)}
                                                className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                                            >
                                                <option value="">Select</option>
                                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-[var(--text-secondary)] mb-1">Max years*</label>
                                            <select
                                                value={formData.maxYears}
                                                onChange={(e) => updateField('maxYears', e.target.value)}
                                                className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                                            >
                                                <option value="">Select</option>
                                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20].map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    Receive candidates via*
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="receiveCandidatesVia"
                                            value="This Portal"
                                            checked={formData.receiveCandidatesVia === 'This Portal'}
                                            onChange={(e) => updateField('receiveCandidatesVia', e.target.value as any)}
                                            className="text-[var(--accent)]"
                                        />
                                        <span className="text-sm text-[var(--text-primary)]">This Portal</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="receiveCandidatesVia"
                                            value="An external medium"
                                            checked={formData.receiveCandidatesVia === 'An external medium'}
                                            onChange={(e) => updateField('receiveCandidatesVia', e.target.value as any)}
                                            className="text-[var(--accent)]"
                                        />
                                        <span className="text-sm text-[var(--text-primary)]">An external medium</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    Deadline to apply*
                                </label>
                                <input
                                    type="date"
                                    value={formData.deadline}
                                    onChange={(e) => updateField('deadline', e.target.value)}
                                    className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Company details */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    Company*
                                </label>
                                <input
                                    type="text"
                                    value={formData.company}
                                    onChange={(e) => updateField('company', e.target.value)}
                                    placeholder="Enter Company name"
                                    className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                    Company Description*
                                </label>
                                <textarea
                                    value={formData.companyDescription}
                                    onChange={(e) => updateField('companyDescription', e.target.value)}
                                    rows={6}
                                    className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                                />
                            </div>
                        </div>
                    )}

                    {/* Navigation buttons */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border-color)]">
                        <button
                            onClick={handleBack}
                            className="px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                        >
                            {currentStep === 1 ? 'Close' : 'Back'}
                        </button>
                        <button
                            onClick={currentStep === 3 ? handleSubmit : handleNext}
                            className="px-6 py-2 bg-[var(--text-secondary)] hover:bg-[var(--text-secondary)] text-[var(--bg-primary)] font-medium"
                        >
                            {currentStep === 3 ? 'Post' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostJob;
