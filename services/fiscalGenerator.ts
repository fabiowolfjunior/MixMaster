
import { jsPDF } from "jspdf";
import { FinancialSettings, Sale, PurchaseRecord, Supplier } from "../types";

// Helper para gerar chave de acesso aleatória de 44 dígitos
const generateAccessKey = (uf: string = '35', year: string, month: string, cnpj: string, model: string, series: string, number: string) => {
    const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    // Simplified structure
    return `${uf}${year}${month}${cnpj.replace(/\D/g, '').padStart(14,'0')}${model}${series.padStart(3,'0')}${number.padStart(9,'0')}1${random}`;
};

// Fake Barcode Generator (Draws lines on PDF)
const drawBarcode = (doc: jsPDF, x: number, y: number, width: number, height: number) => {
    const lines = 50;
    const step = width / lines;
    
    doc.setFillColor(0, 0, 0);
    for (let i = 0; i < lines; i++) {
        // Random width for bars to look like a barcode
        if (Math.random() > 0.5) {
            const barWidth = (Math.random() * step) + 0.5;
            doc.rect(x + (i * step), y, barWidth, height, 'F');
        }
    }
    // Numbers below
    doc.setFontSize(8);
    doc.setFont("courier", "normal");
    doc.text("1234 5678 9012 3456 7890 1234 5678 9012 3456 7890 1234", x, y + height + 3);
};

export const generateFiscalXML = (
    type: 'NFe' | 'NFCe',
    company: FinancialSettings['company'],
    data: any, // Sale or PurchaseRecord
    partner?: Supplier | null // Fornecedor ou Cliente
): string => {
    const now = new Date();
    const emitCnpj = company?.cnpj || '00000000000000';
    const emitName = company?.legalName || 'EMPRESA TESTE LTDA';
    
    // Header
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<${type} xmlns="http://www.portalfiscal.inf.br/nfe">\n`;
    xml += `  <inf${type} Id="${type}${now.getTime()}">\n`;
    
    // Ide
    xml += `    <ide>\n`;
    xml += `      <cUF>35</cUF>\n`;
    xml += `      <natOp>${type === 'NFe' ? 'COMPRA DE MERCADORIA' : 'VENDA AO CONSUMIDOR'}</natOp>\n`;
    xml += `      <mod>${type === 'NFe' ? '55' : '65'}</mod>\n`;
    xml += `      <serie>1</serie>\n`;
    xml += `      <nNF>${Math.floor(Math.random() * 99999)}</nNF>\n`;
    xml += `      <dhEmi>${now.toISOString()}</dhEmi>\n`;
    xml += `    </ide>\n`;

    // Emitente
    xml += `    <emit>\n`;
    xml += `      <CNPJ>${emitCnpj}</CNPJ>\n`;
    xml += `      <xNome>${emitName}</xNome>\n`;
    xml += `      <IE>${company?.ie || ''}</IE>\n`;
    xml += `      <CRT>${company?.regime === 'Simples Nacional' ? '1' : '3'}</CRT>\n`;
    xml += `    </emit>\n`;

    // Destinatário
    xml += `    <dest>\n`;
    if (partner) {
        xml += `      <CNPJ>${partner.document.replace(/\D/g, '')}</CNPJ>\n`;
        xml += `      <xNome>${partner.legalName || partner.name}</xNome>\n`;
    } else {
        xml += `      <xNome>CONSUMIDOR FINAL</xNome>\n`;
    }
    xml += `    </dest>\n`;

    // Detalhes (Itens)
    xml += `    <det>\n`;
    const items = data.items || [];
    items.forEach((item: any, idx: number) => {
        xml += `      <prod>\n`;
        xml += `        <nItem>${idx + 1}</nItem>\n`;
        xml += `        <cProd>${item.productId || item.ingredientId}</cProd>\n`;
        xml += `        <xProd>${item.productName || item.ingredientName}</xProd>\n`;
        xml += `        <qCom>${item.quantity}</qCom>\n`;
        xml += `        <vUnCom>${(item.priceAtSale || item.cost || 0).toFixed(2)}</vUnCom>\n`;
        xml += `      </prod>\n`;
        // Imposto Simulado
        xml += `      <imposto>\n`;
        xml += `        <ICMS>\n`;
        xml += `          <orig>0</orig>\n`;
        xml += `          <CST>00</CST>\n`;
        xml += `        </ICMS>\n`;
        xml += `      </imposto>\n`;
    });
    xml += `    </det>\n`;

    // Totais
    xml += `    <total>\n`;
    xml += `      <ICMSTot>\n`;
    xml += `        <vProd>${(data.total || data.totalValue).toFixed(2)}</vProd>\n`;
    xml += `        <vNF>${(data.total || data.totalValue).toFixed(2)}</vNF>\n`;
    xml += `      </ICMSTot>\n`;
    xml += `    </total>\n`;

    xml += `  </inf${type}>\n`;
    xml += `</${type}>`;

    return xml;
};

export const generateFiscalPDF = (
    type: 'NFe' | 'NFCe',
    company: FinancialSettings['company'],
    data: any,
    xmlContent: string,
    accessKey: string
) => {
    const doc = new jsPDF();
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    
    // --- WATERMARK (BACKGROUND) ---
    doc.saveGraphicsState();
    doc.setTextColor(230, 230, 230);
    doc.setFontSize(50);
    doc.setFont("helvetica", "bold");
    doc.text("SEM VALOR FISCAL", width / 2, height / 2, { align: "center", angle: 45 });
    doc.text("MODO DE TESTE", width / 2, (height / 2) + 20, { align: "center", angle: 45 });
    doc.restoreGraphicsState();

    // --- UTILS ---
    const drawBox = (x: number, y: number, w: number, h: number, title?: string) => {
        doc.setDrawColor(0);
        doc.setLineWidth(0.1);
        doc.rect(x, y, w, h);
        if (title) {
            doc.setFontSize(6);
            doc.setFont("helvetica", "bold");
            doc.text(title.toUpperCase(), x + 1, y + 3);
        }
    };

    const valueBox = (x: number, y: number, w: number, h: number, title: string, value: string) => {
        drawBox(x, y, w, h, title);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(value, x + w - 2, y + 7, { align: 'right' });
    };

    let y = 10;
    const margin = 10;
    const contentWidth = width - (margin * 2);

    // --- HEADER (DANFE STYLE) ---
    
    // Canhoto
    drawBox(margin, y, contentWidth - 30, 15, "RECEBEMOS OS PRODUTOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO");
    drawBox(margin + contentWidth - 30, y, 30, 15, "NF-e");
    doc.setFontSize(10);
    doc.text("Nº 000.001.234", margin + contentWidth - 28, y + 10);
    doc.setFontSize(8);
    doc.text("SÉRIE 1", margin + contentWidth - 28, y + 14);

    y += 18;

    // Emitente Info
    drawBox(margin, y, 90, 35);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(company?.legalName || "NOME DA EMPRESA EMITENTE", margin + 2, y + 8);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(company?.address || "Endereço da Empresa, 000 - Bairro - Cidade/UF", margin + 2, y + 15);
    doc.text(`CNPJ: ${company?.cnpj || '00.000.000/0000-00'}`, margin + 2, y + 25);
    doc.text(`IE: ${company?.ie || 'Isento'}`, margin + 2, y + 29);
    doc.text(`Regime: ${company?.regime || 'Não Informado'}`, margin + 2, y + 33);

    // DANFE Label & Barcode
    drawBox(margin + 92, y, 30, 35, "DANFE");
    doc.setFontSize(8);
    doc.text("Documento Auxiliar", margin + 93, y + 8);
    doc.text("da Nota Fiscal", margin + 93, y + 12);
    doc.text("Eletrônica", margin + 93, y + 16);
    
    doc.setFontSize(7);
    doc.text("0 - Entrada", margin + 93, y + 22);
    doc.text("1 - Saída", margin + 93, y + 26);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(type === 'NFe' ? '0' : '1', margin + 115, y + 24); // 0 Entrada, 1 Saída

    // Chave de Acesso & Barcode
    drawBox(margin + 124, y, contentWidth - 124, 35, "CHAVE DE ACESSO");
    drawBarcode(doc, margin + 126, y + 5, contentWidth - 128, 12);
    
    doc.setFontSize(8);
    doc.setFont("courier", "bold");
    const formattedKey = accessKey.replace(/(.{4})/g, '$1 ');
    doc.text(formattedKey, margin + 126, y + 25);

    doc.setFont("helvetica", "normal");
    doc.text("Consulta de autenticidade no portal nacional da NF-e", margin + 126, y + 32);

    y += 38;

    // Natureza Operação
    drawBox(margin, y, contentWidth, 10, "NATUREZA DA OPERAÇÃO");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(type === 'NFe' ? 'COMPRA PARA COMERCIALIZAÇÃO' : 'VENDA DE MERCADORIA', margin + 2, y + 7);

    y += 12;

    // --- DESTINATÁRIO ---
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("DESTINATÁRIO / REMETENTE", margin, y - 2);
    
    drawBox(margin, y, 100, 10, "NOME / RAZÃO SOCIAL");
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const destName = data.customerName || (type === 'NFe' ? company?.legalName : 'CONSUMIDOR FINAL');
    doc.text(destName || '', margin + 2, y + 7);

    drawBox(margin + 100, y, 50, 10, "CNPJ / CPF");
    // Se for NFe (Compra), o destinatário somos nós. Se for NFCe (Venda), é o cliente.
    const destDoc = type === 'NFe' ? company?.cnpj : (data.customerId ? 'XXX.XXX.XXX-XX' : '');
    doc.text(destDoc || '', margin + 102, y + 7);

    drawBox(margin + 150, y, 40, 10, "DATA DA EMISSÃO");
    doc.text(new Date(data.date || new Date()).toLocaleDateString(), margin + 152, y + 7);

    y += 15;

    // --- PRODUTOS ---
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO PRODUTO / SERVIÇO", margin, y - 2);

    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFontSize(6);
    doc.text("CÓDIGO", margin + 2, y + 4);
    doc.text("DESCRIÇÃO", margin + 20, y + 4);
    doc.text("NCM", margin + 100, y + 4);
    doc.text("UNID", margin + 120, y + 4);
    doc.text("QTD", margin + 135, y + 4);
    doc.text("V.UNIT", margin + 150, y + 4);
    doc.text("V.TOTAL", margin + 175, y + 4);

    y += 6;

    // Items Loop
    const items = data.items || [];
    doc.setFont("helvetica", "normal");
    items.forEach((item: any) => {
        const desc = (item.productName || item.ingredientName || '').substring(0, 45);
        const qtd = item.quantity;
        const val = (item.priceAtSale || item.cost || 0);
        const tot = val * qtd;

        doc.text((item.productId || item.ingredientId || '000').slice(0,6), margin + 2, y + 4);
        doc.text(desc, margin + 20, y + 4);
        doc.text("2202.10.00", margin + 100, y + 4); // Mock NCM
        doc.text("UN", margin + 120, y + 4);
        doc.text(qtd.toString(), margin + 135, y + 4);
        doc.text(val.toFixed(2), margin + 150, y + 4);
        doc.text(tot.toFixed(2), margin + 175, y + 4);

        doc.setDrawColor(220);
        doc.line(margin, y + 6, margin + contentWidth, y + 6);
        y += 6;
    });

    y += 5;

    // --- TOTAIS ---
    doc.setDrawColor(0);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("CÁLCULO DO IMPOSTO", margin, y - 2);

    const totalVal = (data.total || data.totalValue || 0);
    const fakeIcms = totalVal * 0.18;

    valueBox(margin, y, 40, 10, "BASE CÁLC. ICMS", totalVal.toFixed(2));
    valueBox(margin + 40, y, 40, 10, "VALOR DO ICMS", fakeIcms.toFixed(2));
    valueBox(margin + 80, y, 40, 10, "BASE CÁLC. ICMS ST", "0,00");
    valueBox(margin + 120, y, 30, 10, "VALOR DO ICMS ST", "0,00");
    valueBox(margin + 150, y, contentWidth - 150, 10, "VALOR TOTAL DOS PRODUTOS", totalVal.toFixed(2));

    y += 10;
    
    valueBox(margin, y, 40, 10, "VALOR DO FRETE", "0,00");
    valueBox(margin + 40, y, 40, 10, "VALOR DO SEGURO", "0,00");
    valueBox(margin + 80, y, 40, 10, "DESCONTO", "0,00");
    valueBox(margin + 120, y, 30, 10, "OUTRAS DESP.", "0,00");
    valueBox(margin + 150, y, contentWidth - 150, 10, "VALOR TOTAL DA NOTA", totalVal.toFixed(2));

    // Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("DADOS ADICIONAIS", margin, y + 18);
    doc.rect(margin, y + 20, contentWidth, 20);
    doc.setFont("helvetica", "normal");
    doc.text("Inf. Contribuinte: Documento emitido por ME ou EPP optante pelo Simples Nacional.", margin + 2, y + 25);
    doc.text("NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI.", margin + 2, y + 29);
    doc.text("Sistema desenvolvido por MixMaster Gestão - Módulo de Teste.", margin + 2, y + 33);

    return doc;
};

export const createSimulation = (
    type: 'NFe' | 'NFCe',
    settings: FinancialSettings,
    data: any, // Sale or Purchase
    partner?: Supplier | null
) => {
    const today = new Date();
    const accessKey = generateAccessKey(
        '35', 
        today.getFullYear().toString().slice(-2), 
        (today.getMonth() + 1).toString().padStart(2, '0'),
        settings.company?.cnpj || '00000000000000',
        type === 'NFe' ? '55' : '65',
        '001',
        Math.floor(Math.random() * 999999).toString()
    );

    const xml = generateFiscalXML(type, settings.company, data, partner);
    
    return {
        accessKey,
        xmlContent: xml,
        series: '1',
        number: Math.floor(Math.random() * 99999).toString(),
        issuedAt: today.toISOString()
    };
};
