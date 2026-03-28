import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 'light' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 'normal' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 'medium' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 'bold' },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    fontSize: 11,
    paddingTop: 30,
    paddingLeft: 40,
    paddingRight: 40,
    lineHeight: 1.5,
    color: '#333',
  },
  header: {
    marginBottom: 20,
    borderBottom: 2,
    borderColor: '#0066cc',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 'medium',
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 8,
    marginTop: 10,
  },
  paragraph: {
    marginBottom: 8,
    textAlign: 'justify',
  },
  list: {
    marginLeft: 15,
  },
  listItem: {
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: 1,
    borderColor: '#ddd',
    paddingTop: 10,
    fontSize: 9,
    color: '#999',
    textAlign: 'center',
  },
  signatureBox: {
    marginTop: 30,
    borderTop: 1,
    borderColor: '#333',
    paddingTop: 5,
    width: '45%',
  },
  twoColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  table: {
    display: 'table',
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCellHeader: {
    backgroundColor: '#f5f5f5',
    fontWeight: 'bold',
    padding: 5,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
  },
  tableCell: {
    padding: 5,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
  },
});

interface ContractData {
  contractNumber: string;
  title: string;
  clientName: string;
  companyName: string;
  startDate: string;
  endDate: string;
  value: string;
  scopeItems: string[];
  terms: string[];
  paymentTerms: string;
}

export const ContractPDF = ({ data }: { data: ContractData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</Text>
        <Text style={styles.subtitle}>Contrato nº {data.contractNumber}</Text>
      </View>

      {/* Partes Contratantes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. PARTES CONTRATANTES</Text>
        <View style={styles.twoColumns}>
          <View style={{ width: '48%' }}>
            <Text style={{ fontWeight: 'bold' }}>CONTRATANTE:</Text>
            <Text>{data.clientName}</Text>
          </View>
          <View style={{ width: '48%' }}>
            <Text style={{ fontWeight: 'bold' }}>CONTRATADA:</Text>
            <Text>{data.companyName}</Text>
          </View>
        </View>
      </View>

      {/* Objeto do Contrato */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. OBJETO</Text>
        <Text style={styles.paragraph}>
          O presente contrato tem por objeto a prestação de serviços de desenvolvimento 
          e consultoria tecnológica, conforme escopo detalhado abaixo:
        </Text>
        <View style={styles.list}>
          {data.scopeItems.map((item, index) => (
            <Text key={index} style={styles.listItem}>• {item}</Text>
          ))}
        </View>
      </View>

      {/* Vigência */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. VIGÊNCIA</Text>
        <Text style={styles.paragraph}>
          O presente contrato terá vigência de <Text style={{ fontWeight: 'bold' }}>{data.startDate}</Text> até{' '}
          <Text style={{ fontWeight: 'bold' }}>{data.endDate}</Text>, podendo ser renovado mediante 
          acordo entre as partes.
        </Text>
      </View>

      {/* Valor e Condições de Pagamento */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. VALOR E CONDIÇÕES DE PAGAMENTO</Text>
        <Text style={styles.paragraph}>
          Pela prestação dos serviços, o CONTRATANTE pagará à CONTRATADA o valor total de{' '}
          <Text style={{ fontWeight: 'bold' }}>{data.value}</Text>, conforme condições:{' '}
          <Text style={{ fontWeight: 'bold' }}>{data.paymentTerms}</Text>
        </Text>
      </View>

      {/* Termos e Condições */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. TERMOS E CONDIÇÕES GERAIS</Text>
        <View style={styles.list}>
          {data.terms.map((term, index) => (
            <Text key={index} style={styles.listItem}>• {term}</Text>
          ))}
        </View>
      </View>

      {/* Assinaturas */}
      <View style={[styles.section, { marginTop: 40 }]}>
        <View style={styles.twoColumns}>
          <View style={styles.signatureBox}>
            <Text style={{ textAlign: 'center' }}>_________________________</Text>
            <Text style={{ textAlign: 'center', fontSize: 9 }}>CONTRATANTE</Text>
            <Text style={{ textAlign: 'center', fontSize: 9 }}>{data.clientName}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={{ textAlign: 'center' }}>_________________________</Text>
            <Text style={{ textAlign: 'center', fontSize: 9 }}>CONTRATADA</Text>
            <Text style={{ textAlign: 'center', fontSize: 9 }}>{data.companyName}</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Documento gerado eletronicamente em {new Date().toLocaleDateString('pt-BR')} • 
        ReobotLabs Portal • Contrato Digital
      </Text>
    </Page>
  </Document>
);

// Scope PDF Template
interface ScopeData {
  projectName: string;
  description: string;
  deliverables: string[];
  timeline: { phase: string; duration: string; description: string }[];
  exclusions: string[];
  assumptions: string[];
}

export const ScopePDF = ({ data }: { data: ScopeData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>ESCOPO DO PROJETO</Text>
        <Text style={styles.subtitle}>{data.projectName}</Text>
      </View>

      {/* Descrição do Projeto */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. DESCRIÇÃO DO PROJETO</Text>
        <Text style={styles.paragraph}>{data.description}</Text>
      </View>

      {/* Entregáveis */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. ENTREGÁVEIS</Text>
        <View style={styles.list}>
          {data.deliverables.map((item, index) => (
            <Text key={index} style={styles.listItem}>✓ {item}</Text>
          ))}
        </View>
      </View>

      {/* Cronograma */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. CRONOGRAMA</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>Fase</Text>
            <Text style={styles.tableCellHeader}>Duração</Text>
            <Text style={styles.tableCellHeader}>Descrição</Text>
          </View>
          {data.timeline.map((phase, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCell}>{phase.phase}</Text>
              <Text style={styles.tableCell}>{phase.duration}</Text>
              <Text style={styles.tableCell}>{phase.description}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Exclusões */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. EXCLUSÕES</Text>
        <Text style={styles.paragraph}>
          Os seguintes itens NÃO estão incluídos no escopo deste projeto:
        </Text>
        <View style={styles.list}>
          {data.exclusions.map((item, index) => (
            <Text key={index} style={styles.listItem}>✗ {item}</Text>
          ))}
        </View>
      </View>

      {/* Premissas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. PREMISSAS</Text>
        <View style={styles.list}>
          {data.assumptions.map((item, index) => (
            <Text key={index} style={styles.listItem}>• {item}</Text>
          ))}
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Documento gerado eletronicamente em {new Date().toLocaleDateString('pt-BR')} • 
        ReobotLabs Portal • Escopo do Projeto
      </Text>
    </Page>
  </Document>
);
