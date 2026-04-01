import React, { useState, useEffect, useRef } from "react";
import "./index.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function App() {
  // ---------------------- Inicialização do PDF ----------------------
  useEffect(() => {
    try {
      const doc = new jsPDF();
      doc.text("Teste de jsPDF funcionando!", 20, 20);
      console.log("✅ jsPDF carregado corretamente!");
    } catch (error) {
      console.error("❌ Erro ao inicializar jsPDF:", error);
    }
  }, []);

  // ---------------------- Estados principais ----------------------
  const [registros, setRegistros] = useState(() => {
    const salvo = localStorage.getItem("registros");
    return salvo ? JSON.parse(salvo) : [];
  });

  const [data, setData] = useState(() => new Date().toISOString().split("T")[0]);
  const [entrada, setEntrada] = useState("");
  const [saida, setSaida] = useState("");
  const [horasEdit, setHorasEdit] = useState("");
  const [minutosEdit, setMinutosEdit] = useState("");
  const [editandoIndex, setEditandoIndex] = useState(null);
  const [editandoHorarioIndex, setEditandoHorarioIndex] = useState(null);
  const [valorHora, setValorHora] = useState(() => parseFloat(localStorage.getItem("valorHora")) || 10);

  // 🔹 Observação vinculada à data
  const [observacao, setObservacao] = useState("");

  // 🔹 Refs para navegação com Enter
  const valorHoraRef = useRef(null);
  const dataRef = useRef(null);
  const entradaRef = useRef(null);
  const saidaRef = useRef(null);
  const horasRef = useRef(null);
  const minutosRef = useRef(null);
  const observacaoRef = useRef(null);

  // 🔹 Ref para tabela, para rolagem automática
  const tabelaRef = useRef(null);
  const ultimoRegistroRef = useRef(null);

  // ---------------------- Persistência ----------------------
  useEffect(() => {
    localStorage.setItem("registros", JSON.stringify(registros));
  }, [registros]);

  useEffect(() => {
    localStorage.setItem("valorHora", valorHora);
  }, [valorHora]);

  // ---------------------- Carregar observação da data selecionada ----------------------
  useEffect(() => {
    const registroDia = registros.find((r) => r.data === data);
    setObservacao(registroDia?.observacao || "");
  }, [data, registros]);
 // ---------------------- Rolar para o último registro adicionado ----------------------
  useEffect(() => {
  ultimoRegistroRef.current?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}, [registros]);

  // ---------------------- Funções auxiliares ----------------------
  const formatarDataBR = (dataISO) => {
    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const getDiaSemana = (dataISO) => {
    const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const d = new Date(dataISO + "T00:00:00");
    return dias[d.getDay()];
  };

  const formatarMoeda = (valor) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(valor || 0);

  // ---------------------- Adicionar / Atualizar registro ----------------------
  const adicionarRegistro = () => {
    if (!entrada && !saida) {
      atualizarDia({ data, horarios: [], folga: true, vazio: false, observacao });
      return;
    }
    if (!entrada || !saida) {
      alert("Preencha os dois horários ou deixe ambos vazios para registrar folga!");
      return;
    }

    let horas, minutos;
    if (horasEdit || minutosEdit) {
      horas = Number(horasEdit) || 0;
      minutos = Number(minutosEdit) || 0;
    } else {
      const [hEntrada, mEntrada] = entrada.split(":").map(Number);
      const [hSaida, mSaida] = saida.split(":").map(Number);
      const dataEntrada = new Date(0, 0, 0, hEntrada, mEntrada);
      const dataSaida = new Date(0, 0, 0, hSaida, mSaida);
      if (dataSaida < dataEntrada) dataSaida.setDate(dataSaida.getDate() + 1);
      const diffMs = dataSaida - dataEntrada;
      horas = Math.floor(diffMs / 1000 / 60 / 60);
      minutos = Math.floor((diffMs / 1000 / 60) % 60);
    }

    const valor = (horas + minutos / 60) * valorHora;
    const novoHorario = { entrada, saida, horas, minutos, valor };
    atualizarDia({ data, horarios: [novoHorario], folga: false, vazio: false, observacao });

    // Avança para o próximo dia automaticamente
    const novaData = new Date(data);
    novaData.setDate(novaData.getDate() + 1);
    setData(novaData.toISOString().split("T")[0]);

    setEntrada("");
    setSaida("");
    setHorasEdit("");
    setMinutosEdit("");
    setTimeout(() => entradaRef.current?.focus(), 100);
  };

  // Atualiza ou cria o dia correspondente
  const atualizarDia = (registroObj) => {
    const novos = [...registros];
    const i = novos.findIndex((r) => r.data === registroObj.data);

    if (editandoIndex !== null && editandoHorarioIndex !== null) {
      const atual = novos[editandoIndex];
      const horarios = [...(atual.horarios || [])];
      horarios[editandoHorarioIndex] = registroObj.horarios[0];
      novos[editandoIndex] = { ...atual, horarios, folga: false, vazio: false, observacao: registroObj.observacao };
      setEditandoIndex(null);
      setEditandoHorarioIndex(null);
    } else if (i !== -1) {
      const existente = novos[i];
      const horariosAtualizados = [...(existente.horarios || []), ...registroObj.horarios];
      novos[i] = { ...existente, horarios: horariosAtualizados, folga: false, vazio: false, observacao: registroObj.observacao };
    } else {
      novos.push(registroObj);
      novos.sort((a, b) => new Date(a.data) - new Date(b.data));
    }

    setRegistros(novos);

    // 🔹 Rola tabela automaticamente para o último registro
    setTimeout(() => {
      tabelaRef.current?.scrollTo({
        top: tabelaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 50);
  };

  const editarRegistro = (i, j) => {
    const r = registros[i];
    const h = r.horarios[j];
    setData(r.data);
    setEntrada(h.entrada);
    setSaida(h.saida);
    setHorasEdit(h.horas);
    setMinutosEdit(h.minutos);
    setEditandoIndex(i);
    setEditandoHorarioIndex(j);
  };

  const excluirRegistro = (i, j) => {
    const novos = [...registros];
    const dia = novos[i];
    const horarios = [...(dia.horarios || [])];
    horarios.splice(j, 1);
    novos[i] = { ...dia, horarios };
    setRegistros(novos);
  };

  const limparTudo = () => {
    if (window.confirm("Apagar todos os registros?")) {
      setRegistros([]);
      localStorage.removeItem("registros");
    }
  };

  // ---------------------- Cálculos de totais ----------------------
  const totalMinutos = registros.reduce((acc, r) => {
    if (r.folga || r.vazio) return acc;
    return acc + r.horarios.reduce((s, h) => s + h.horas * 60 + h.minutos, 0);
  }, 0);
  const totalHoras = Math.floor(totalMinutos / 60);
  const totalMins = totalMinutos % 60;
  const totalEuros = registros.reduce((acc, r) => {
    if (r.folga || r.vazio) return acc;
    return acc + r.horarios.reduce((s, h) => s + (h.valor || 0), 0);
  }, 0);

  // ---------------------- PDF ----------------------
  const gerarPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(18);
    doc.text("Relatório de Controle de Horas", 40, 50);
    const dataAtual = new Date().toLocaleDateString("pt-BR");
    doc.setFontSize(11);
    doc.text(`Gerado em: ${dataAtual}`, 40, 70);

    const cabecalhos = [["Data", "Dia", "Entrada", "Saída", "Resultado", "Valor (€)"]];
    const corpo = [];

    registros.forEach((r) => {
      if (r.folga) {
        corpo.push([formatarDataBR(r.data), getDiaSemana(r.data), "-", "-", "Folga ", "-"]);
      } else if (r.vazio) {
        corpo.push([formatarDataBR(r.data), getDiaSemana(r.data), "-", "-", "Excluído", "-"]);
      } else {
        r.horarios.forEach((h, idx) => {
          corpo.push([
            idx === 0 ? formatarDataBR(r.data) : "",
            idx === 0 ? getDiaSemana(r.data) : "",
            h.entrada,
            h.saida,
            `${h.horas}h ${h.minutos}min`,
            formatarMoeda(h.valor),
          ]);
        });
      }
    });

    autoTable(doc, {
      startY: 90,
      head: cabecalhos,
      body: corpo,
      theme: "grid",
      styles: { fontSize: 10, halign: "center" },
      headStyles: { fillColor: [25, 118, 210] },
      margin: { left: 40, right: 40 },
    });

    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 110;
    doc.setFontSize(12);
    doc.text(`Total: ${totalHoras}h ${totalMins}min — ${formatarMoeda(totalEuros)}`, 40, finalY + 10);
    if (observacao.trim()) {
      doc.text("Observação:", 40, finalY + 40);
      doc.text(observacao, 40, finalY + 60, { maxWidth: 500 });
    }
    doc.save("controle_de_horas.pdf");
  };

  // ---------------------- Navegação com Enter ----------------------
  const handleKeyDown = (e, nextRef, action = null) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (action) action();
      else nextRef?.current?.focus();
    }
  };

  // ---------------------- Renderização ----------------------
  return (
    <div className="app">
      {/* Painel esquerdo fixo (formulário) */}
      <div className="formulario">
        <h1>Controle de Horas</h1>

        <label>Valor por hora (€): {formatarMoeda(valorHora)} </label>
        <input
  ref={valorHoraRef}
  type="text"
  inputMode="decimal"
  value={valorHora}
  onChange={(e) => {
    let valor = e.target.value;

    // Permite apenas números, vírgula e ponto
    valor = valor.replace(/[^0-9.,]/g, "");

    // Substitui vírgula por ponto
    valor = valor.replace(",", ".");

    setValorHora(valor);
  }}
  onBlur={(e) => {
    let numero = parseFloat(e.target.value);

    if (isNaN(numero)) numero = 0;

    setValorHora(numero.toFixed(2)); // formata 2 casas
  }}
  onKeyDown={(e) => handleKeyDown(e, dataRef)}
/>

        <label>Data:</label>
        <input
          ref={dataRef}
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, entradaRef)}
        />

        <label>Entrada:</label>
        <input
          ref={entradaRef}
          type="time"
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, saidaRef)}
        />

        <label>Saída:</label>
        <input
          ref={saidaRef}
          type="time"
          value={saida}
          onChange={(e) => setSaida(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, horasRef, adicionarRegistro)}
        />

        <label>Editar Resultado (opcional):</label>
        <div className="duplo-campo">
          <input
            ref={horasRef}
            type="number"
            placeholder="Horas"
            value={horasEdit}
            onChange={(e) => setHorasEdit(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, minutosRef)}
          />
          <input
            ref={minutosRef}
            type="number"
            placeholder="Minutos"
            value={minutosEdit}
            onChange={(e) => setMinutosEdit(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, observacaoRef)}
          />
        </div>

        {/* 🔹 Botões */}
        <div className="botoes">
          <button className="btn-add" onClick={adicionarRegistro}>
            {editandoIndex !== null ? "Salvar" : "Adicionar"}
          </button>
          <button className="btn-clear" onClick={limparTudo}>
            Limpar Tudo
          </button>
        </div>

        {/* 🔹 Total dentro do formulário */}
        <div className="total-formulario">
          Total: {totalHoras}h {totalMins}min — {formatarMoeda(totalEuros)}
        </div>

        {/* 🔹 Botão PDF */}
        <div className="botoes" style={{ marginTop: "10px" }}>
          <button onClick={gerarPDF} style={{ backgroundColor: "#0288d1", width: "100%" }}>
            Gerar PDF
          </button>
        </div>
      </div>

      {/* Painel direito (tabela) */}
      <div className="calendario" ref={tabelaRef}>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Dia</th>
              <th>Entrada</th>
              <th>Saída</th>
              <th>Resultado</th>
              <th>Valor (€)</th>
              <th>Ações</th>
            </tr>
          </thead>
        <tbody>
  {registros.length === 0 ? (
    <tr>
      <td colSpan="7" className="vazio">
        Nenhum registro ainda.
      </td>
    </tr>
  ) : (
    registros.map((r, i) =>
      (r.horarios || []).map((h, j) => (
        <tr
  key={`${i}-${j}`}
  ref={
    i === registros.length - 1 &&
    j === r.horarios.length - 1
      ? ultimoRegistroRef
      : null
  }
>
          {j === 0 && (
            <>
              <td data-label="Data" rowSpan={r.horarios.length}>
                {formatarDataBR(r.data)}
              </td>
              <td data-label="Dia" rowSpan={r.horarios.length}>
                {getDiaSemana(r.data)}
              </td>
            </>
          )}

          <td data-label="Entrada">{h.entrada}</td>
          <td data-label="Saída">{h.saida}</td>

          <td data-label="Resultado">
            {h.horas}h {h.minutos}min
          </td>

          <td data-label="Valor (€)">
            {formatarMoeda(h.valor)}
          </td>

          <td className="acoes" data-label="Ações">
            <button onClick={() => editarRegistro(i, j)} style={{ backgroundColor: "#1679ae" }}>
              Editar
            </button>
            <button className="excluir" onClick={() => excluirRegistro(i, j)}>
              Excluir
            </button>
          </td>
        </tr>
      ))
    )
  )}
</tbody>
        </table>

        {/* 🔹 Observação vinculada à data */}
        <div style={{ marginTop: "10px" }}>
          <label>Observações do dia {formatarDataBR(data)}:</label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows="4"
            style={{ width: "100%", resize: "vertical" }}
            placeholder="Digite observações para este dia..."
          />
        </div>
      </div>
    </div>
  );
}

export default App;