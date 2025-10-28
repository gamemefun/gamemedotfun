import "./background.js";

function copyContractAddress() {
  const caElement = document.getElementById("contract-address") as HTMLElement;
  const copyButton = document.querySelector(".copy-btn") as HTMLButtonElement;

  if (!caElement || !copyButton) return;

  let contractAddress = caElement.innerText;
  if (contractAddress.startsWith("CA: ")) {
    contractAddress = contractAddress.substring(4).trim();
  }
  navigator.clipboard.writeText(contractAddress).then(() => {
    copyButton.innerText = "[COPIED!]";
    copyButton.classList.add("copied");
    copyButton.disabled = true;

    setTimeout(() => {
      copyButton.innerText = "[COPY]";
      copyButton.classList.remove("copied");
      copyButton.disabled = false;
    }, 2000);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const copyButton = document.querySelector(".copy-btn") as HTMLButtonElement;
  if (copyButton) {
    copyButton.addEventListener("click", copyContractAddress);
  }
});
