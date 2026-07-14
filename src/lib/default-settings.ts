import type { Settings } from "./types";
import logoAsset from "@/assets/madeena-logo.png.asset.json";
import watermarkAsset from "@/assets/madeena-watermark.png.asset.json";

export const defaultSettings: Settings = {
  company: {
    name: "MADEENA TRADERS",
    address: "No.28, T.H Road, Kodungaiyur, Chennai – 600118",
    phone: "9952911590",
    phone2: "9841378979",
    email: "inboxmadeena@gmail.com",
    gstin: "33BWAPM4444B2Z1",
    state: "Tamil Nadu",
    companyTagline: "An Abdul Munaf Foundation Since 1980",
    logoDataUrl: logoAsset.url,
    signatureDataUrl: "",
    watermarkDataUrl: watermarkAsset.url,
  },
  bank: {
    bankName: "BANK OF INDIA",
    accountNumber: "802120110001465",
    ifsc: "BKID0008021",
    branch: "Kodungaiyur, Chennai",
  },
  invoicePrefix: "INV",
  invoiceDigits: 4,
  defaultGstPercent: 18,
  nextInvoiceNumber: 1,
  gstMode: "CGST_SGST",
  productMaster: [],
  quotationPrefix: "QT",
  quotationDigits: 4,
  nextQuotationNumber: 1,
  quotationDefaultValidityDays: 15,
  quotationDefaultTerms:
    "Prices are valid for 15 days.\nGoods once sold cannot be returned.\nTransportation charges extra if applicable.\nGST as applicable.\nPayment terms as agreed.",
  quotationDefaultNotes: "",
};
