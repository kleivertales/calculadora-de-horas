
/**
 * App.js
 * Versão React (JavaScript) do seu Controle de Horas
 * - Remove import/export JSON
 * - Adiciona função gerarPDF que cria um PDF do calendário (tabela + total)
 *
 * Comentários detalhados explicam cada função para estudo.
 */

import React, { useState, useEffect, useRef } from "react";
import "./App.css";

// Biblioteca para gerar PDF no cliente
// (instalei via `npm install jspdf jspdf-autotable`)
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function App() {

  useEffect(() => {
  try {
    const doc = new jsPDF();
    doc.text("Teste de jsPDF funcionando!", 20, 20);
    console.log("✅ jsPDF carregado corretamente!");
  } catch (error) {
    console.error("❌ Erro ao inicializar jsPDF:", error);
  }
}, []);
  // ---------------------------
  // 🔹 ESTADOS PRINCIPAIS
  // ---------------------------

  // Recupera os registros salvos no localStorage ao iniciar o app
  const [registros, setRegistros] = useState(() => {
    const dadosSalvos = localStorage.getItem("registros");
    return dadosSalvos ? JSON.parse(dadosSalvos) : [];
  });

  // Estados dos campos do formulário
  const [data, setData] = useState(() => new Date().toISOString().split("T")[0]);
  const [entrada, setEntrada] = useState("");
  const [saida, setSaida] = useState("");
  const [horasEdit, setHorasEdit] = useState("");
  const [minutosEdit, setMinutosEdit] = useState("");
  const [editandoIndex, setEditandoIndex] = useState(null); // Índice de registro sendo editado

  // Refs para manipular o foco dos inputs (Entrada e Saída)
  const entradaRef = useRef(null);
  const saidaRef = useRef(null);

  // ---------------------------
  // 🔹 LOCALSTORAGE
  // ---------------------------

  // Salva automaticamente os registros sempre que o estado "registros" for alterado
  useEffect(() => {
    localStorage.setItem("registros", JSON.stringify(registros));
  }, [registros]);

  // ---------------------------
  // 🔹 FUNÇÕES AUXILIARES
  // ---------------------------

  /**
   * formatarDataBR
   * Recebe uma data no formato ISO (aaaa-mm-dd) e retorna dd/mm/aaaa.
   * Usado apenas para exibir a data legível na UI e no PDF.
   */
  const formatarDataBR = (dataISO) => {
    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  // ---------------------------
  // 🔹 ADICIONAR REGISTRO
  // ---------------------------

  /**
   * adicionarRegistro
   * - Valida os campos
   * - Calcula horas/minutos entre entrada e saída (ou usa edição manual)
   * - Adiciona novo registro ao array (ou atualiza um existente, se estiver em edição)
   * - Ordena por data, atualiza next date e limpa campos
   */
  const adicionarRegistro = () => {
    let registro;

    // Caso não tenha entrada nem saída, é considerado um dia de folga
    if (!entrada && !saida) {
      registro = { data, entrada: "-", saida: "-", horas: 0, minutos: 0, folga: true, vazio: false };
    }
    // Caso tenha apenas um dos horários preenchidos
    else if (!entrada || !saida) {
      alert("Preencha os dois horários ou deixe ambos vazios para registrar folga!");
      return;
    }
    // Caso normal: calcular a diferença entre os horários
    else {
      let horas, minutos;

      // Se o usuário quiser editar manualmente o resultado
      if (horasEdit || minutosEdit) {
        horas = Number(horasEdit) || 0;
        minutos = Number(minutosEdit) || 0;
      } else {
        // Calcula a diferença de tempo entre entrada e saída
        const [hEntrada, mEntrada] = entrada.split(":").map(Number);
        const [hSaida, mSaida] = saida.split(":").map(Number);
        const dataEntrada = new Date(0, 0, 0, hEntrada, mEntrada);
        const dataSaida = new Date(0, 0, 0, hSaida, mSaida);
        if (dataSaida < dataEntrada) dataSaida.setDate(dataSaida.getDate() + 1); // Passou da meia-noite
        const diffMs = dataSaida - dataEntrada;
        horas = Math.floor(diffMs / 1000 / 60 / 60);
        minutos = Math.floor((diffMs / 1000 / 60) % 60);
      }

      // Cria o objeto do registro
      registro = { data, entrada, saida, horas, minutos, folga: false, vazio: false };
    }

    // Adiciona ou atualiza o registro no array
    const novosRegistros = [...registros];
    if (editandoIndex !== null) {
      // Atualiza registro
      novosRegistros[editandoIndex] = registro;
      setEditandoIndex(null);
    } else {
      // Adiciona novo registro
      novosRegistros.push(registro);
    }

    // Ordena por data antes de salvar
    novosRegistros.sort((a, b) => new Date(a.data) - new Date(b.data));
    setRegistros(novosRegistros);

    // Define próxima data automaticamente
    const proximaData = new Date(data);
    proximaData.setDate(proximaData.getDate() + 1);
    setData(proximaData.toISOString().split("T")[0]);

    // Limpa os campos
    setEntrada("");
    setSaida("");
    setHorasEdit("");
    setMinutosEdit("");

    // Retorna o foco para o campo de entrada
    entradaRef.current?.focus();
  };

  // ---------------------------
  // 🔹 EDITAR REGISTRO EXISTENTE
  // ---------------------------

  /**
   * editarRegistro
   * - Carrega os dados do registro selecionado no formulário para edição
   * - Marca o índice em edição para que adicionarRegistro atualize em vez de criar novo
   */
  const editarRegistro = (index) => {
    const r = registros[index];
    setData(r.data);
    setEntrada(r.entrada === "-" ? "" : r.entrada);
    setSaida(r.saida === "-" ? "" : r.saida);
    setHorasEdit(r.horas || "");
    setMinutosEdit(r.minutos || "");

    // Marca o registro como ativo para edição (remove sinalizador de 'vazio' se houver)
    const novos = [...registros];
    novos[index].vazio = false;
    setRegistros(novos);
    setEditandoIndex(index);

    // Move o foco para o campo de entrada
    entradaRef.current?.focus();
  };

  // ---------------------------
  // 🔹 EXCLUIR REGISTRO
  // ---------------------------

  /**
   * excluirRegistro
   * - Em vez de apagar o registro do array, marcamos como 'vazio' para permitir edição/recuperação
   * - Isso evita perder histórico acidentalmente
   */
  const excluirRegistro = (index) => {
    const novos = [...registros];
    // Marca o registro como "vazio" (não apaga completamente)
    novos[index] = { ...novos[index], entrada: "-", saida: "-", horas: 0, minutos: 0, folga: false, vazio: true };
    setRegistros(novos);
  };

  // ---------------------------
  // 🔹 LIMPAR TUDO
  // ---------------------------

  /**
   * limparTudo
   * - Confirmação com o usuário antes de apagar todos os registros
   * - Remove também do localStorage
   */
  const limparTudo = () => {
    if (window.confirm("Tem certeza que deseja apagar todos os registros?")) {
      setRegistros([]); // Limpa o estado
      localStorage.removeItem("registros"); // Remove do localStorage
    }
  };

  // ---------------------------
  // 🔹 CÁLCULO DO TOTAL DE HORAS
  // ---------------------------

  // totalMinutos = soma (horas * 60 + minutos) de todos os registros válidos
  const totalMinutos = registros.reduce(
    (acc, r) => (!r.folga && !r.vazio ? acc + r.horas * 60 + r.minutos : acc),
    0
  );
  const totalHoras = Math.floor(totalMinutos / 60);
  const totalMins = totalMinutos % 60;
  const hoje = new Date().toISOString().split("T")[0];

  // ---------------------------
  // 🔹 GERAR PDF DO CALENDÁRIO (CLIENT-SIDE)
  // ---------------------------

  /**
   * gerarPDF
   * - Cria um PDF (A4) com título, data de geração, tabela dos registros e total no final.
   * - Usa jsPDF + autoTable para converter os dados para uma tabela PDF automaticamente.
   * - Faz o download automático do arquivo gerado.
   *
   * Passos principais:
   * 1. Verifica se há registros (se não, alerta o usuário)
   * 2. Monta cabecalhos e corpo (array de arrays) para autoTable
   * 3. Configura estilo e margens, adiciona título e data
   * 4. Insere a tabela (autoTable cuida de múltiplas páginas automaticamente)
   * 5. Adiciona o total de horas abaixo da tabela
   * 6. Salva o PDF com nome 'controle_de_horas.pdf'
   */
  const gerarPDF = () => {
    if (registros.length === 0) {
      alert("Nenhum registro para gerar o PDF!");
      return;
    }

    // Cria instância do jsPDF (unidade em pontos, formato A4)
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    // Título
    doc.setFontSize(18);
    doc.text("Relatório de Controle de Horas", 40, 50);

    // Data de geração
    const dataAtual = new Date().toLocaleDateString("pt-BR");
    doc.setFontSize(11);
    doc.text(`Gerado em: ${dataAtual}`, 40, 70);

    // Cabeçalhos e corpo da tabela
    const cabecalhos = [["Data", "Entrada", "Saída", "Resultado"]];
    const corpo = registros.map((r) => [
      formatarDataBR(r.data),
      r.entrada,
      r.saida,
      r.vazio ? "Registro excluído" : r.folga ? "Folga 💤" : `${r.horas}h ${r.minutos}min`,
    ]);

    // Insere a tabela no PDF
    autoTable(doc, {
      startY: 90,
      head: cabecalhos,
      body: corpo,
      theme: "grid", // grid, striped, plain
      styles: { fontSize: 10, halign: "center" },
      headStyles: { fillColor: [25, 118, 210] }, // azul do header
      margin: { left: 40, right: 40 },
      // Se a tabela ocupar várias páginas, autoTable cuidará das quebras automaticamente.
    });

    // Posição final da tabela (última Y) — útil para posicionar o total
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 110;

    // Total exibido abaixo da tabela
    doc.setFontSize(12);
    doc.text(`Total: ${totalHoras} horas e ${totalMins} minutos`, 40, finalY);

    // Salva/baixa o PDF
    doc.save("controle_de_horas.pdf");
  };

  // ---------------------------
  // 🔹 RENDERIZAÇÃO DO APP
  // ---------------------------

  return (
    <div className="app">
      {/* Painel Esquerdo - Formulário */}
      <div className="formulario">
        <div>
          <h1>Controle de Horas</h1>

          {/* Campo de data */}
          <label>Data:</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} />

          {/* Campo de entrada */}
          <label>Horário de Entrada:</label>
          <input
            type="time"
            ref={entradaRef} // usado para foco
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            onKeyDown={(e) => {
              // Quando pressionar ENTER → vai para o campo "Saída"
              if (e.key === "Enter") {
                e.preventDefault();
                saidaRef.current?.focus();
              }
            }}
          />

          {/* Campo de saída */}
          <label>Horário de Saída:</label>
          <input
            type="time"
            ref={saidaRef} // usado para foco
            value={saida}
            onChange={(e) => setSaida(e.target.value)}
            onKeyDown={(e) => {
              // Quando pressionar ENTER → adiciona registro
              if (e.key === "Enter") {
                e.preventDefault();
                adicionarRegistro();
              }
            }}
          />

          {/* Edição manual do resultado */}
          <label>Editar Resultado (opcional):</label>
          <div style={{ display: "flex", gap: "4%", width: "100%" }}>
            <input
              type="number"
              placeholder="Horas"
              value={horasEdit}
              onChange={(e) => setHorasEdit(e.target.value)}
              min="0"
              style={{ width: "48%" }}
            />
            <input
              type="number"
              placeholder="Minutos"
              value={minutosEdit}
              onChange={(e) => setMinutosEdit(e.target.value)}
              min="0"
              max="59"
              style={{ width: "48%" }}
            />
          </div>

          {/* Botões principais */}
          <div className="botoes">
            <button className="btn-add" onClick={adicionarRegistro}>Adicionar</button>
            <button className="btn-clear" onClick={limparTudo}>Limpar Tudo</button>
          </div>

          {/* BOTÃO GERAR PDF (substitui Importar/Exportar JSON) */}
          <div className="botoes" style={{ marginTop: "10px" }}>
            <button onClick={gerarPDF} style={{ backgroundColor: "#0288d1", width: "100%" }}>
              Gerar PDF
            </button>
          </div>
        </div>

        {/* Total de horas calculado */}
        <div className="total">
          Total: {totalHoras} horas e {totalMins} minutos
        </div>
      </div>

      {/* Painel Direito - Tabela */}
      <div className="calendario">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Entrada</th>
              <th>Saída</th>
              <th>Resultado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {/* Caso não existam registros */}
            {registros.length === 0 ? (
              <tr>
                <td colSpan="5" className="vazio">Nenhum registro ainda.</td>
              </tr>
            ) : (
              // Renderiza cada linha de registro
              registros.map((r, i) => (
                <tr key={i}>
                  <td className={r.data === hoje ? "highlight" : ""}>{formatarDataBR(r.data)}</td>
                  <td>{r.entrada}</td>
                  <td>{r.saida}</td>
                  <td>
                    {r.vazio ? (
                      <span className="vazio">Registro excluído (editar novamente)</span>
                    ) : r.folga ? (
                      <span className="folga">Folga 💤</span>
                    ) : (
                      `${r.horas}h ${r.minutos}min`
                    )}
                  </td>
                  <td className="acoes">
                    <button onClick={() => editarRegistro(i)}>Editar</button>
                    <button className="excluir" onClick={() => excluirRegistro(i)}>Excluir</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;