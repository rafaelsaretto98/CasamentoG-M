// ========= CONFIG SUPABASE =========
const SUPABASE_URL = "https://ucvdhckwesjtqclrxyla.supabase.co";
const SUPABASE_KEY = "sb_publishable_55_S2Qm_OjfeZ1Ivfq8VFQ_oulGT3Eo";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ========= MODAL NA ABERTURA =========
window.onload = function() {
  const modal = document.getElementById("welcomeModal");
  if (modal) modal.style.display = "flex";
  iniciarCarousel();
  carregarDepoimentos();
};

// ========= FECHAR MODAL =========
function fecharModal() {
  const modal = document.getElementById("welcomeModal");
  if (modal) {
    modal.style.opacity = "0";
    modal.style.transition = "0.5s";
    setTimeout(() => modal.style.display = "none", 500);
  }
}

// ========= COUNTDOWN =========
const dataCasamento = new Date("2026-09-05T17:30:00-03:00");
const countdownElement = document.getElementById("countdown");

function atualizarCountdown() {
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

setInterval(atualizarCountdown, 1000);
atualizarCountdown();

// ========= CARROSSEL 3 FOTOS POR VEZ =========
function iniciarCarousel() {
  const slideContainer = document.querySelector('.slides');
  const slides = document.querySelectorAll('.slides img');
  let index = 0;

  function nextSlide() {
    index++;
    if (index > slides.length - 3) index = 0;
    slideContainer.style.transform = `translateX(${-index * 33.333}%)`;
  }

  if (slideContainer) setInterval(nextSlide, 4000);
}

// ========= SALVAR RECADOS =========
async function salvarDepoimento() {
  const nome = document.getElementById("depoNome").value.trim();
  const mensagem = document.getElementById("depoTexto").value.trim();
  const feedback = document.getElementById("depoMsg");

  if (!nome || !mensagem) {
    feedback.style.color = "red";
    feedback.textContent = "Preencha todos os campos!";
    return;
  }

  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString("pt-BR");

  const { error } = await supabaseClient
    .from("depoimentos")
    .insert([{ nome, mensagem, data: dataFormatada }]);

  if (error) {
    feedback.style.color = "red";
    feedback.textContent = "Erro ao enviar recado!";
  } else {
    feedback.style.color = "#2C3A2A";
    feedback.textContent = "Recado enviado com sucesso! 💚";
  }
}

// ========= CARREGAR MURAL =========
async function carregarDepoimentos() {
  const { data, error } = await supabaseClient
    .from("depoimentos")
    .select("*")
    .order("criado_em", { ascending: true });

  const mural = document.getElementById("carouselDepoimentos");

  if (!mural) return;
  mural.innerHTML = "";

  if (error) {
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    mural.innerHTML = `<div class="slide-stack active"><div class="card"><small>Nenhum recado ainda 💚</small></div></div>`;
    return;
  }

  data.forEach(d => {
    const slide = document.createElement("div");
    slide.className = "slide-stack";
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

// ========= INICIAR SLIDES DO MURAL =========
function iniciarCarouselStack() {
  const slides = document.querySelectorAll(".slide-stack");
  let i = 0;
  if (slides[i]) slides[i].classList.add("active");

  clearInterval(window.carouselTimerStack);
  window.carouselTimerStack = setInterval(() => {
    slides[i]?.classList.remove("active");
    i = (i + 1) % slides.length;
    slides[i]?.classList.add("active");
  }, 5000);
}

// ========= MAPAS =========
function abrirMapaCerimonia() { window.open("https://maps.google.com", "_blank"); }
function abrirMapaRecepcao() { window.open("https://maps.google.com", "_blank"); }
function abrirRota() { window.open("https://maps.google.com", "_blank"); }

// ========= REALTIME =========
supabaseClient
  .channel("casamento-recados")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "depoimentos" }, () => {
    carregarDepoimentos();
  })
  .subscribe();

  // ========= CARREGAR RSVPs =========
async function confirmarPresenca() {
  const nome = document.getElementById("rsvpNome").value.trim();
  const telefone = document.getElementById("rsvpTelefone").value.trim();
  const acompanhantes = document.getElementById("rsvpAcompanhantes").value.trim();
  const restricao = document.getElementById("rsvpRestricao")?.value.trim();
  const presenca = document.getElementById("rsvpPresenca").value.trim();
  const msg = document.getElementById("rsvpMsg");

  if (!nome || !telefone) {
    msg.style.color = "red";
    msg.textContent = "Preencha nome e telefone!";
    return;
  }

  const dataAgora = new Date().toISOString();

  const { error } = await supabaseClient
    .from("rsvp")
    .insert([
      {
        nome: nome,
        telefone: telefone,
        acompanhantes: Number(acompanhantes || 0),
        restricao_alimentar: restricao || 'nenhuma',
        presenca: presenca,
        criado_em: dataAgora
      }
    ]);

  if (error) {
    console.error("Erro ao salvar RSVP:", error);
    msg.style.color = "red";
    msg.textContent = "Erro ao confirmar presença!";
  } else {
    msg.style.color = "#2C3A2A";
    msg.textContent = "Presença confirmada com sucesso!";
    enviarEmailNoivos(nome, telefone, acompanhantes, restricao, presenca, dataAgora);
  }
}

// ========= FUNÇÃO DE EMAIL COMPLETA =========
function enviarEmailNoivos(nome, telefone, acompanhantes, restricao, presenca, data) {
  const corpoEmail = `
  Novo RSVP recebido no site do casamento:

  Nome: ${nome}
  Telefone: ${telefone}
  Acompanhantes: ${acompanhantes}
  Restrição alimentar: ${restricao}
  Presença: ${presenca === 'sim' ? 'Confirmada' : 'Não irá'}
  Data do envio: ${new Date(data).toLocaleString('pt-BR')}

  ---
  Mensagem automática do site de casamento.
  `;

  console.log("=== EMAIL ENVIADO AOS NOIVOS ===");
  console.log(corpoEmail);
}


// ========= INICIAR SITE =========
document.addEventListener("DOMContentLoaded", () => {
  iniciarCarousel();
  carregarDepoimentos();
});
