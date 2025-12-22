import{g as m}from"./index-CWsFgdiM.js";async function b(c,n){const{format:a}=n;switch(a){case"pdf":return y(c);case"ubl-xml":return i(c);case"peppol-bis":return d(c);case"json":return x(c);case"csv":return p(c);default:throw new Error(`Unsupported export format: ${a}`)}}async function y(c){await m(c)}function i(c,n){return new Promise(a=>{const e=l(c);s(e,`${c.invoiceNumber}.xml`,"application/xml"),a()})}function l(c,n){const a=e=>e||"";return`<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  
  <!-- Header Information -->
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${t(c.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${a(c.issueDate)}</cbc:IssueDate>
  ${c.dueDate?`<cbc:DueDate>${a(c.dueDate)}</cbc:DueDate>`:""}
  <cbc:InvoiceTypeCode>${c.invoiceTypeCode||"380"}</cbc:InvoiceTypeCode>
  ${c.note?`<cbc:Note>${t(c.note)}</cbc:Note>`:""}
  <cbc:DocumentCurrencyCode>${c.currency}</cbc:DocumentCurrencyCode>
  
  <!-- Seller (AccountingSupplierParty) -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      ${c.seller.vatId?`
      <cac:PartyIdentification>
        <cbc:ID schemeID="VAT">${t(c.seller.vatId)}</cbc:ID>
      </cac:PartyIdentification>
      `:""}
      ${c.seller.legalOrganizationId?`
      <cac:PartyLegalEntity>
        <cbc:CompanyID>${t(c.seller.legalOrganizationId)}</cbc:CompanyID>
        <cbc:RegistrationName>${t(c.seller.name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      `:""}
      <cac:PartyName>
        <cbc:Name>${t(c.seller.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${t(c.seller.address.street)}</cbc:StreetName>
        <cbc:CityName>${t(c.seller.address.city)}</cbc:CityName>
        <cbc:PostalZone>${t(c.seller.address.postalCode)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${t(c.seller.address.country)}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${c.seller.contactEmail||c.seller.contactPhone?`
      <cac:Contact>
        ${c.seller.contactEmail?`<cbc:ElectronicMail>${t(c.seller.contactEmail)}</cbc:ElectronicMail>`:""}
        ${c.seller.contactPhone?`<cbc:Telephone>${t(c.seller.contactPhone)}</cbc:Telephone>`:""}
      </cac:Contact>
      `:""}
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <!-- Buyer (AccountingCustomerParty) -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      ${c.buyer.vatId?`
      <cac:PartyIdentification>
        <cbc:ID schemeID="VAT">${t(c.buyer.vatId)}</cbc:ID>
      </cac:PartyIdentification>
      `:""}
      <cac:PartyName>
        <cbc:Name>${t(c.buyer.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${t(c.buyer.address.street)}</cbc:StreetName>
        <cbc:CityName>${t(c.buyer.address.city)}</cbc:CityName>
        <cbc:PostalZone>${t(c.buyer.address.postalCode)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${t(c.buyer.address.country)}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${c.buyer.contactEmail?`
      <cac:Contact>
        <cbc:ElectronicMail>${t(c.buyer.contactEmail)}</cbc:ElectronicMail>
      </cac:Contact>
      `:""}
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  ${c.paymentTerms?`
  <!-- Payment Terms -->
  <cac:PaymentTerms>
    <cbc:Note>${t(c.paymentTerms)}</cbc:Note>
  </cac:PaymentTerms>
  `:""}
  
  <!-- Tax Total -->
  ${c.taxTotals.map(e=>`
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${c.currency}">${e.taxAmount.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${c.currency}">${e.taxableAmount.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${c.currency}">${e.taxAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${e.taxCategory}</cbc:ID>
        <cbc:Percent>${e.taxPercent}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  `).join(`
`)}
  
  <!-- Monetary Totals -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${c.currency}">${c.lineExtensionAmount.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${c.currency}">${c.taxExclusiveAmount.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${c.currency}">${c.taxInclusiveAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${c.currency}">${c.payableAmount.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  
  <!-- Line Items -->
  ${c.lines.map((e,o)=>{const r=e.quantity*e.unitPrice;return`
  <cac:InvoiceLine>
    <cbc:ID>${o+1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${t(e.unitCode)}">${e.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${c.currency}">${r.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${t(e.description)}</cbc:Description>
      <cbc:Name>${t(e.description)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${e.taxCategory}</cbc:ID>
        <cbc:Percent>${e.taxPercent}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${c.currency}">${e.unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
    `}).join(`
`)}
  
</Invoice>`}function d(c){return new Promise(n=>{const a=l(c);s(a,`${c.invoiceNumber}_PEPPOL.xml`,"application/xml"),n()})}function x(c){return new Promise(n=>{const a=JSON.stringify(c,null,2);s(a,`${c.invoiceNumber}.json`,"application/json"),n()})}function p(c){return new Promise(n=>{const a=["Line","Description","Quantity","Unit","Unit Price","Tax %","Tax Category","Line Total"],e=c.lines.map((r,u)=>[(u+1).toString(),r.description,r.quantity.toString(),r.unitCode,r.unitPrice.toFixed(2),r.taxPercent.toString(),r.taxCategory,(r.quantity*r.unitPrice).toFixed(2)]),o=[`Invoice: ${c.invoiceNumber}`,`Issue Date: ${c.issueDate}`,`Seller: ${c.seller.name}`,`Buyer: ${c.buyer.name}`,`Currency: ${c.currency}`,"",a.join(","),...e.map(r=>r.map(u=>`"${u}"`).join(",")),"",`Subtotal,${c.lineExtensionAmount.toFixed(2)}`,`Tax Inclusive Total,${c.taxInclusiveAmount.toFixed(2)}`,`Amount Due,${c.payableAmount.toFixed(2)}`].join(`
`);s(o,`${c.invoiceNumber}.csv`,"text/csv"),n()})}function s(c,n,a){const e=new Blob([c],{type:a}),o=URL.createObjectURL(e),r=document.createElement("a");r.href=o,r.download=n,document.body.appendChild(r),r.click(),document.body.removeChild(r),URL.revokeObjectURL(o)}function t(c){return c.replace(/&/g,"&").replace(/</g,"<").replace(/>/g,">").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}async function I(c,n){for(let a=0;a<c.length;a++)await b(c[a],{format:n}),a<c.length-1&&await new Promise(e=>setTimeout(e,300))}export{b as exportInvoice,I as exportInvoicesBulk};
