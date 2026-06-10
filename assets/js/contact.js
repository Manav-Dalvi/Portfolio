/* Contact form: EmailJS with mailto fallback */

$(document).ready(function () {

    $("#contact-form").submit(function (event) {
        event.preventDefault();

        const form = document.getElementById("contact-form");
        const submitBtn = document.getElementById("submit-btn");

        if (!form.checkValidity()) {
            showFeedback("Please fill all required fields correctly.", "error");
            return;
        }

        submitBtn.classList.add("loading");
        showFeedback("Sending your message...", "info");

        const formData = new FormData(form);
        const name = formData.get('name');
        const email = formData.get('email');
        const phone = formData.get('phone');
        const message = formData.get('message');

        try {
            emailjs.init("bYCByK8rWJAaLeq64");

            emailjs.sendForm('service_5ef9kdh', 'template_y1l9c39', '#contact-form')
                .then(function (response) {
                    form.reset();
                    submitBtn.classList.remove("loading");
                    showFeedback("Thank you! Your message has been sent successfully. I'll get back to you soon!", "success");

                    setTimeout(hideFeedback, 5000);
                }, function (error) {
                    console.log('EmailJS failed, using fallback', error);
                    sendDirectEmail(name, email, phone, message);
                });
        } catch (error) {
            console.log('EmailJS not available, using fallback');
            sendDirectEmail(name, email, phone, message);
        }
    });

    function sendDirectEmail(name, email, phone, message) {
        const mailtoLink = `mailto:manavdalvi.md@gmail.com?subject=Portfolio Contact from ${name}&body=Name: ${name}%0D%0AEmail: ${email}%0D%0APhone: ${phone}%0D%0AMessage: ${message}`;

        window.open(mailtoLink, '_blank');

        const submitBtn = document.getElementById("submit-btn");
        submitBtn.classList.remove("loading");
        showFeedback("Email client opened! Please send the email manually. Thank you!", "info");

        setTimeout(hideFeedback, 8000);
    }

    function showFeedback(message, type) {
        const feedback = document.getElementById("form-feedback");
        feedback.textContent = message;
        feedback.className = `form-feedback ${type}`;
        feedback.style.display = "block";
        feedback.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function hideFeedback() {
        const feedback = document.getElementById("form-feedback");
        feedback.style.display = "none";
    }

    // real-time validation feedback
    const formInputs = document.querySelectorAll("#contact-form input, #contact-form textarea");
    formInputs.forEach(input => {
        input.addEventListener("blur", function () {
            this.style.borderColor = this.checkValidity() ? "#28a745" : "#dc3545";
        });

        input.addEventListener("input", function () {
            if (this.value.length > 0) {
                this.style.borderColor = this.checkValidity() ? "#28a745" : "#dc3545";
            } else {
                this.style.borderColor = "";
            }
        });
    });

});
