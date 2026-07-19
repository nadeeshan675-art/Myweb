from flask import Flask, render_template, request, redirect, url_path
import os

app = Flask(__name__)
UPLOAD_FOLDER = 'static/images'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# දැනට ඩේටා තියාගන්න සරල dictionary එකක් (පස්සේ database එකකට සම්බන්ධ කරන්න පුළුවන්)
company_data = {
    "name": "ඔබේ සමාගමේ නම",
    "logo": "default-logo.png" # default ලෝගෝ එකක්
}

@app.route('/')
def home():
    # PC එකෙන් බලන ප්‍රධාන පිටුව
    return render_template('dashboard.html', company=company_data)

@app.route('/register-company', methods=['POST'])
def register_company():
    global company_data
    company_name = request.form.get('company_name')
    logo_file = request.files.get('company_logo')
    
    if company_name:
        company_data['name'] = company_name
        
    if logo_file and logo_file.filename != '':
        # ලෝගෝ එක static/images ෆෝල්ඩර් එකට save කිරීම
        logo_path = os.path.join(app.config['UPLOAD_FOLDER'], logo_file.filename)
        logo_file.save(logo_path)
        company_data['logo'] = logo_file.filename
        
    return redirect('/')

@app.route('/invoice')
def view_invoice():
    # ඉන්වොයිස් එක පෙන්වන පිටුව
    return render_template('invoice.html', company=company_data)

if __name__ == '__main__':
    app.run(debug=True)
