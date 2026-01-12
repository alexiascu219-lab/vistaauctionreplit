import React from 'react';
import Navbar from '../components/Navbar';
import ApplicationForm from '../components/ApplicationForm';

import Footer from '../components/Footer';

const Apply = () => {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <main className="pt-24 pb-12 px-4 flex-grow">
                <ApplicationForm />
            </main>
            <Footer />
        </div>
    );
};

export default Apply;
