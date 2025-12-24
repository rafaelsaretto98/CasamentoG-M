// ========= CONFIG SUPABASE =========
const SUPABASE_URL = "https://ucvdhckwesjtqclrxyla.supabase.co";
const SUPABASE_KEY = "sb_publishable_55_S2Qm_OjfeZ1Ivfq8VFQ_oulGT3Eo";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ========= CONFIGURAÇÕES GERAIS =========
// Data corrigida para 24 de Maio de 2026 conforme o index.html
const dataCasamento = new Date("2026-05-24T17:30:00-03:00");

// ========= INICIALIZAÇÃO AO CARREGAR =========
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("welcomeModal");
  if (modal) modal.style.display = "flex";

  iniciarCarousel();
  carregarDepoimentos();
  atualizarCountdown();
  setInterval(atualizarCountdown, 1000);
});

// ========= FUNÇÕES DE INTERFACE =========
function fecharModal() {
  const modal = document.getElementById("welcomeModal");
  if (modal) {
    modal.style.opacity = "0";
    modal.style.transition = "0.5s";
    setTimeout(() => modal.style.display = "none", 500);
  }
}

function atualizarCountdown() {
  const countdownElement = document.getElementById("countdown");
  if (!countdownElement) return;

  const agora = new Date();
  const diff = dataCasamento - agora;

  if (diff <= 0) {
    countdownElement.textContent = "O grande dia chegou! 💚";
    return;
  }

  const dias = Math.floor(diff / 86400000);
  const horas = Math.floor((diff / 3600000) % 24);
  const min = Math.floor((diff / 60000) % 60);
  const seg = Math.floor((diff / 1000) % 60);

  countdownElement.textContent = `Faltam ${dias} dias, ${horas}h ${min}m ${seg}s`;
}

// ========= CARROSSEL DE FOTOS =========
function iniciarCarousel() {
  const slideContainer = document.querySelector('.slides');
  const slides = document.querySelectorAll('.slides img');
  let index = 0;

  if (slideContainer && slides.length > 0) {
    setInterval(() => {
      index++;
      if (index > slides.length - 3) index = 0;
      slideContainer.style.transform = `translateX(${-index * 33.333}%)`;
    }, 4000);
  }
}

// ========= LÓGICA DE RECADOS (DEPOIMENTOS) =========
async function salvarDepoimento() {
  const nome = document.getElementById("depoNome").value.trim();
  const mensagem = document.getElementById("depoTexto").value.trim();
  const feedback = document.getElementById("depoMsg");

  if (!nome || !mensagem) {
    feedback.style.color = "red";
    feedback.textContent = "Preencha todos os campos!";
    return;
  }

  const { error } = await supabaseClient
    .from("depoimentos")
    .insert([{ nome, mensagem }]);

  if (error) {
    feedback.style.color = "red";
    feedback.textContent = "Erro ao enviar recado!";
  } else {
    document.getElementById("depoNome").value = "";
    document.getElementById("depoTexto").value = "";
    feedback.style.color = "#2C3A2A";
    feedback.textContent = "Recado enviado com sucesso! 💚";
    carregarDepoimentos();
  }
}

async function carregarDepoimentos() {
  const mural = document.getElementById("carouselDepoimentos");
  if (!mural) return;

  const { data, error } = await supabaseClient
    .from("depoimentos")
    .select("*")
    .order("criado_em", { ascending: false }); // Alterado para criado_em

  if (error || !data || data.length === 0) {
    mural.innerHTML = `<div class="slide-stack active"><div class="card"><small>Nenhum recado ainda 💚</small></div></div>`;
    return;
  }

  mural.innerHTML = "";
  data.forEach((d, idx) => {
    const slide = document.createElement("div");
    slide.className = idx === 0 ? "slide-stack active" : "slide-stack";
    slide.innerHTML = `
      <div class="card">
        <p class="recado-data">${new Date(d.criado_em).toLocaleDateString("pt-BR")}</p>
        <p>"${d.mensagem}"</p>
        <small>– ${d.nome}</small>
      </div>`;
    mural.appendChild(slide);
  });

  iniciarCarouselStack();
}

function iniciarCarouselStack() {
  const slides = document.querySelectorAll(".slide-stack");
  if (slides.length <= 1) return;

  let i = 0;
  clearInterval(window.carouselTimerStack);
  window.carouselTimerStack = setInterval(() => {
    slides[i].classList.remove("active");
    i = (i + 1) % slides.length;
    slides[i].classList.add("active");
  }, 5000);
}

// ========= LÓGICA DE RSVP =========
async function confirmarPresenca() {
  const nome = document.getElementById("rsvpNome").value.trim();
  const telefone = document.getElementById("rsvpTelefone").value.trim();
  const emailElem = document.getElementById("rsvpEmail");
  const email = emailElem ? emailElem.value.trim() : "Não informado";
  const acompanhantes = document.getElementById("rsvpAcompanhantes").value;
  const restricao = document.getElementById("rsvpRestricao").value;
  const presenca = document.getElementById("rsvpPresenca").value;
  const msg = document.getElementById("rsvpMsg");

  if (!nome || !telefone) {
    msg.style.color = "red";
    msg.textContent = "Preencha pelo menos nome e telefone!";
    return;
  }

  const { error } = await supabaseClient
    .from("rsvp")
    .insert([{
        nome,
        telefone,
        email,
        acompanhantes: parseInt(acompanhantes) || 0,
        restricao_alimentar: restricao,
        presenca
    }]);

  if (error) {
    console.error(error);
    msg.style.color = "red";
    msg.textContent = "Erro ao enviar confirmação.";
  } else {
    msg.style.color = "green";
    msg.textContent = "Presença confirmada! Obrigado! 💚";
  }
}

// ========= PAINEL ADMIN =========
async function carregarRSVPAdmin() {
  const lista = document.getElementById("adminLista");
  if (!lista) return;

  const { data, error } = await supabaseClient
    .from("rsvp")
    .select("*")
    .order("criado_em", { ascending: false }); // Alterado para criado_em

  if (error) {
    console.error("Erro Supabase:", error);
    lista.innerHTML = `<div class="admin-card erro">Erro ao carregar dados: ${error.message}</div>`;
    return;
  }

  lista.innerHTML = data.length ? "" : `<div class="admin-card vazio">Nenhuma confirmação ainda.</div>`;

  data.forEach(d => {
    const card = document.createElement("div");
    card.className = "admin-card";
    card.innerHTML = `
      <strong>${d.nome}</strong> (${d.presenca === 'sim' ? 'Confirmado' : 'Não irá'})<br>
      📞 ${d.telefone} | ✉ ${d.email || 'Não informado'}<br>
      👥 Acompanhantes: ${d.acompanhantes}<br>
      🍽 Restrição: ${d.restricao_alimentar}<br>
      <small>Data: ${new Date(d.criado_em).toLocaleString("pt-BR")}</small>
    `;
    lista.appendChild(card);
  });
}

// ========= MAPAS =========
function abrirMapaCerimonia() { window.open("https://maps.google.com/?q=Capela+Santa+Catarina+de+Alexandria+Joinville", "_blank"); }
function abrirMapaRecepcao() { window.open("https://maps.google.com/?q=Sua+Recepcao+Aqui", "_blank"); }
function abrirRota() { window.open("https://www.google.com/maps/dir/?api=1&destination=Capela+Santa+Catarina+de+Alexandria+Joinville", "_blank"); }
